const superagent = require("superagent");
const { GoogleGenerativeAI } = require("@google/generative-ai");

exports.validateMessage = (req, res, next) => {
  const { message } = req.body;
  if (!message) {
    return res.status(400).json({
      status: "error",
      message: "Please provide valid text to turn into flashcards.",
    });
  }
  req.cleanText = message.trim();
  next();
};

exports.generateFlashCard = async (req, res) => {
  const text = req.cleanText;

  try {
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
You are a smart study assistant. Turn the following text into flashcards in JSON format.
Each flashcard should have a "question" and "answer".
Use clear, concise language. Generate up to 8 flashcards.

Text:
"""
${text}
"""

Return ONLY a JSON array like:
[
  {"question": "What is...", "answer": "The..."},
  {"question": "Explain...", "answer": "..."}
]
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let flashcardsText = response.text();
    flashcardsText = flashcardsText.replace(/```json\n?|```/g, "").trim();
    const flashcards = JSON.parse(flashcardsText);

    if (!Array.isArray(flashcards)) {
      throw new Error("Invalid format: expected array of flashcards");
    }

    res.status(200).json({
      status: "success",
      flashcards,
    });
  } catch (error) {
    console.error("Gemini API Error:", error.message);

    if (error.message.includes("API key")) {
      return res.status(500).json({
        status: "error",
        message: "Gemini API configuration error.",
      });
    }

    if (error.message.includes("429")) {
      return res.status(429).json({
        status: "error",
        message: "Too many requests. Please try again later.",
      });
    }

    res.status(500).json({
      status: "error",
      message: "Failed to generate flashcards. Please try again.",
    });
  }
};
