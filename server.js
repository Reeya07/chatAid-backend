import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { recommendNextStep } from "./recommendation.js";

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());

const HF_TOKEN = process.env.HF_TOKEN;
const HF_MODEL = process.env.HF_MODEL;
const API_URL = "https://router.huggingface.co/v1/chat/completions"
const HF_EMOTION_MODEL = process.env.HF_EMOTION_MODEL;
const EMOTION_API_URL =`https://router.huggingface.co/hf-inference/models/${HF_EMOTION_MODEL}`;

function systemPrompt(){
  return`
  You are chatAid, a supportive mental health companion chatbot.

  Reply directly to the user.
  -Be warm and empathetic
  -Ask ONE gentle follow-up question
  -Give ONE small coping suggestion .
  -Avoid generic advice like "go for a walk" unless the user asks for lifestyle tips.
  -Keep replies short(2-6 sentences)
  -Make the user feel accompanied,not instructed.

  Structured preference:
  1.Emotional reflection
  2.One focused question
  
  
  Rules:
  -Do not diagnose
  -Do not mention being an AI
  -Do not include any <think> or </think> tags and message inside these tags in every reponse
  -Do not explain your steps, planning, or reasoning
  -Do Not output "Okay,let's see"or"First/Next/Then"
  -Only write the final message to the user
  Safety: If the user mentions self-harm or suicide:
  -Encourage contracting local emergency services immediately.

  `.trim();
}
function cbtPrompt({situation,thought,thinking_pattern,evidence_for,advice}){
  return`
  You are chatAid. Your help users reframe unhelpful thoughts using cbt.

  Reply a short balanced thought (1-2 sentences) that feels natural and supportive.
  
  Rules:
  - Do NOT ask any questions (no "?", no "what if", no "have you tried", no "could you").
- Do NOT diagnose.
- Do NOT mention being an AI.
- Do NOT include any <think> or </think> tags or any hidden reasoning.
- Do NOT explain your steps, planning, or reasoning.
- Do NOT output filler like "Okay", "Let's see", "First/Next/Then".
- Keep it short, realistic, and supportive (not overly positive).
- Use simple language.
- Give concrete next steps the user can do today.
  Safety: If the user mentions self-harm or suicide:
  -Encourage contracting local emergency services immediately.

  Context:
  Situation : ${situation || "not provided"}
  Thought: ${thought|| "not provided"}
  Thinking Pattern : ${thinking_pattern || "not provided"}
  Evidence for: ${evidence_for || "not provided"}
  What I'd tell a friend:${advice || "not provided"}
  OUTPUT FORMAT (EXACTLY 2 LINES):
  Balanced: <1–2 sentences, supportive, not a question>
  Next: <1 sentence OR 2 short bullet actions separated by " • ">

  `.trim();
}


function removeThink(text){
  if(!text) return "";
  if(text.includes("</think>")){
    return text.replace(/<think>[\s\S]*?<\/think>/gi,"").trim();
    
  }
  return text.replace(/<think>[\s\S]*/i,"").trim();
}
  async function detectEmotion(text) {
    try{
      const response = await fetch(EMOTION_API_URL,{
        method:"POST",
        headers:{
          Authorization:`Bearer ${HF_TOKEN}`,
          "Content-Type":"application/json",
        },
        body: JSON.stringify({inputs:text}),
      });
      const result = await response.json();
      if(!response.ok || !Array.isArray(result) || result.length ===0){
        return {emotion:"unknown",score:0};
      }
      const topEmotion = result[0][0];
      return{
        emotion: topEmotion.label,
        score: topEmotion.score,
      };
    }catch(error){
      return{emotion:"unknown",score:0};
    }
      }

app.post("/chat", async (request,response)=>{
  

  try{
    const message =(request.body.message || "").toString();
    if(!message) return response.status(400).json({error:"Message is empty"});
    if(!HF_TOKEN){
      return response.status(500).json({
        error:"Missing Token in .env",
      });
    }
    const emotionResult = await detectEmotion(message);
    const requestData = {
      model : HF_MODEL,
      messages: [
     { role: "system", content: systemPrompt()},
    { role: "user",content: message},
   
      ],
    
      max_tokens: 350,
      temperature: 0.9,
    }
  const hfResponse = await fetch(API_URL,{
    method: "POST",
    headers:{
      Authorization: `Bearer ${HF_TOKEN}`,
      "Content-Type":"application/json",
    },
    body:JSON.stringify(requestData),
  })
  const hfData = await hfResponse.json();
  if(!hfResponse.ok){
    return response.status(hfResponse.status).json({
      error:"Error from hugging Face",
      details: hfData,
    })
  }
  const rawReply = hfData?.choices?.[0]?.message?.content || "";
  const botReply = removeThink(rawReply)  || "I'm here with you.Would you like to share more?";

  const recommendation = recommendNextStep({
  emotion: emotionResult.emotion,
  text: message,
});
  
  return response.json({
    reply: botReply,
    emotion: emotionResult.emotion,
    score: emotionResult.score,
    recommendation,
  });
  }catch(error){
    return response.status(500).json({error:String(error)});
  }
  
})
app.post ("/cbt/reframe",async (request,response)=>{
  try{
    const situation =(request.body.situation || "").toString();
    const thought =(request.body.thought || "").toString();
    const thinking_pattern =(request.body.thinking_pattern || "").toString();
    const evidence_for =(request.body.evidence_for || "").toString();
    const advice =(request.body.advice || "").toString();


    if(!thought) return response.status(400).json({error:"Thought is empty"});
      const requestData = {
      model : HF_MODEL,
      messages: [
     { role: "system", content: cbtPrompt({ situation,thought,thinking_pattern,evidence_for,advice})},
    { role: "user",content: thought},
   
      ],
    
      max_tokens: 220,
      temperature: 0.7,
    }
  const hfResponse = await fetch(API_URL,{
    method: "POST",
    headers:{
      Authorization: `Bearer ${HF_TOKEN}`,
      "Content-Type":"application/json",
    },
    body:JSON.stringify(requestData),
  })
  const hfData = await hfResponse.json();
  if(!hfResponse.ok){
    return response.status(hfResponse.status).json({
      error:"Error from hugging Face",
      details: hfData,
    })
  }
  const raw = hfData?.choices?.[0]?.message?.content || "";
  const balancedthought = removeThink(raw);
  
  return response.json({
    balancedthought
  });
  }catch(error){
    return response.status(500).json({error:String(error)});
  }
})



const PORT = process.env.PORT || 3000;
app.listen(PORT,"0.0.0.0",()=>{
  console.log(`Backend running on port ${PORT}`);
})


