
export function recommendNextStep({ emotion, text }) {
  const t = (text || "").toLowerCase();

  const isGreeting =
    ["hello", "hi", "hey", "good morning", "good evening"].some((w) => t.includes(w));

  const isOverthinking =
    ["overthink", "thinking too much", "what if", "can't stop thinking", "worried"].some((w) => t.includes(w));

  const isSad =
    ["sad", "down", "empty", "hopeless", "cry"].some((w) => t.includes(w));

  const isAngry =
    ["angry", "mad", "furious", "rage"].some((w) => t.includes(w));

  const isFear =
    ["anxious", "panic", "fear", "scared", "stress", "stressed"].some((w) => t.includes(w));

  // Default
  let rec = {
    type: "chat",            // chat | exercise | cbt | journal
    label: "💬 Continue chatting",
    id: "",                  // for exercise
    initialThought: "",      // for cbt
    journalPrompt: "",       // for journal
    reason: "Let’s explore a bit more."
  };


  if (isGreeting) {
    return {
      type: "chat",
      label: "💬 Tell me what’s going on",
      id: "",
      initialThought: "",
      journalPrompt: "",
      reason: "Start with what you need help with."
    };
  }

  const isEmergency =
    [
      "suicide",
      "kill myself",
      "want to die",
      "end my life",
      "hurt myself",
      "self-harm",
      "harm myself",
      "don't want to live",
      "i want to die",
      "i feel unsafe",
      "i can't go on"
    ].some((w) => t.includes(w));

  // Emergency check first
  if (isEmergency) {
    return {
      type: "support", // chat | exercise | cbt | journal | support
      label: "Emergency Support",
      id: "emergency",
      initialThought: "",
      journalPrompt: "",
      reason: "The message suggests immediate emotional support may be needed."
    };
  }
  // Emotion 
  if (emotion === "fear" || isFear) {
    rec = {
      type: "exercise",
      label: "🌬 Quick calm (60s)",
      id: "breathing",
      initialThought: "",
      journalPrompt: "",
      reason: "Calm the body first."
    };
  } else if (emotion === "anger" || isAngry) {
    rec = {
      type: "exercise",
      label: " Grounding reset",
      id: "grounding",
      initialThought: "",
      journalPrompt: "",
      reason: "Grounding helps when anger spikes."
    };
  } else if (emotion === "sadness" || isSad) {
    rec = {
      type: "journal",
      label: "Journal this",
      id: "",
      initialThought: "",
      journalPrompt: "Write what’s been weighing on you most today.",
      reason: "Putting it into words can ease heaviness."
    };
  } else if (isOverthinking || emotion === "disgust") {
    rec = {
      type: "cbt",
      label: "Try CBT reframe",
      id: "",
      initialThought: text, 
      journalPrompt: "",
      reason: "CBT helps untangle unhelpful thinking."
    };
  } else if (emotion === "surprise") {
    rec = {
      type: "chat",
      label: "Clarify what happened",
      id: "",
      initialThought: "",
      journalPrompt: "",
      reason: "Let’s make sense of it first."
    };
  }

  return rec;
}