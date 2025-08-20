import React, { useState, useEffect, useRef } from "react";
import {
  Mic,
  MicOff,
  Play,
  Pause,
  RotateCcw,
  FileText,
  Brain,
  Volume2,
  Settings,
  Download,
  Upload,
} from "lucide-react";

const App = () => {
  // State management
  const [currentView, setCurrentView] = useState("input"); // input, study, settings
  const [inputText, setInputText] = useState("");
  const [flashcards, setFlashcards] = useState([]);
  const [currentCard, setCurrentCard] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [studyStats, setStudyStats] = useState({
    correct: 0,
    incorrect: 0,
    total: 0,
  });
  const [spacedRepetition, setSpacedRepetition] = useState({});
  const [showAnswer, setShowAnswer] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [speechRate, setSpeechRate] = useState(1);
  const [autoAdvance, setAutoAdvance] = useState(false);
  const [loading, setLoading] = useState(false);

  // Refs
  const recognitionRef = useRef(null);
  const synthRef = useRef(null);

  // Initialize speech recognition and synthesis
  useEffect(() => {
    if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = false;

      recognitionRef.current.onresult = (event) => {
        const command = event.results[event.results.length - 1][0].transcript
          .toLowerCase()
          .trim();
        handleVoiceCommand(command);
      };

      recognitionRef.current.onerror = () => {
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    // Initialize speech synthesis
    if ("speechSynthesis" in window) {
      synthRef.current = window.speechSynthesis;
    }

    // Load data from IndexedDB on mount
    loadUserData();
  }, []);

  // IndexedDB operations
  const openDB = () => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open("EchoLearnDB", 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains("flashcards")) {
          db.createObjectStore("flashcards", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("stats")) {
          db.createObjectStore("stats", { keyPath: "id" });
        }
      };
    });
  };

  const saveToIndexedDB = async (storeName, data) => {
    try {
      const db = await openDB();
      const transaction = db.transaction([storeName], "readwrite");
      const store = transaction.objectStore(storeName);
      await store.put(data);
    } catch (error) {
      console.error("Error saving to IndexedDB:", error);
    }
  };

  const loadFromIndexedDB = async (storeName, id) => {
    try {
      const db = await openDB();
      const transaction = db.transaction([storeName], "readonly");
      const store = transaction.objectStore(storeName);
      const request = store.get(id);

      return new Promise((resolve, reject) => {
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
      });
    } catch (error) {
      console.error("Error loading from IndexedDB:", error);
      return null;
    }
  };

  const loadUserData = async () => {
    const savedCards = await loadFromIndexedDB("flashcards", "current");
    const savedStats = await loadFromIndexedDB("stats", "current");

    if (savedCards?.cards) {
      setFlashcards(savedCards.cards);
      setSpacedRepetition(savedCards.spacedRepetition || {});
    }

    if (savedStats) {
      setStudyStats(savedStats);
    }
  };

  // Generate flashcards from text (simulated NLP)
  const generateFlashcards = async () => {
    if (!inputText.trim()) return;

    try {
      setLoading(true);

      const response = await fetch("/api/flashcard", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: inputText }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate flashcards");
      }

      const data = await response.json();
      console.log(data);

      if (data.status !== "success" || !Array.isArray(data.flashcards)) {
        throw new Error("Invalid response format");
      }

      const newCards = data.flashcards.map((card, index) => ({
        id: Date.now() + index,
        question: card.question,
        answer: card.answer,
        lastReviewed: null,
        nextReview: Date.now(),
        correctCount: 0,
        incorrectCount: 0,
      }));

      setFlashcards(newCards);
      setCurrentCard(0);
      setCurrentView("study");
      setShowAnswer(false);

      // Save to IndexedDB
      await saveToIndexedDB("flashcards", {
        id: "current",
        cards: newCards,
        spacedRepetition: {},
      });

      speak("Flashcards generated successfully! Let's start studying.");
    } catch (error) {
      console.error("Failed to generate flashcards:", error);
      alert(
        "Sorry, we couldn't generate flashcards. Please check your internet connection and try again."
      );
    } finally {
      setLoading(false); // ✅ Always stop loading
    }
  };

  // Voice commands handler
  const handleVoiceCommand = (command) => {
    if (command.includes("next") || command.includes("continue")) {
      nextCard();
    } else if (command.includes("repeat") || command.includes("again")) {
      repeatCard();
    } else if (command.includes("show answer") || command.includes("reveal")) {
      setShowAnswer(true);
      speakAnswer();
    } else if (command.includes("correct") || command.includes("right")) {
      markCard(true);
    } else if (command.includes("incorrect") || command.includes("wrong")) {
      markCard(false);
    } else if (command.includes("previous") || command.includes("back")) {
      previousCard();
    } else if (command.includes("stop") || command.includes("pause")) {
      stopSpeaking();
    }
  };

  // Speech synthesis
  const speak = (text, rate = speechRate) => {
    if (!voiceEnabled || !synthRef.current) return;

    synthRef.current.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = rate;
    utterance.volume = 0.8;

    utterance.onstart = () => setIsPlaying(true);
    utterance.onend = () => {
      setIsPlaying(false);
      if (autoAdvance && showAnswer) {
        setTimeout(() => nextCard(), 1000);
      }
    };

    synthRef.current.speak(utterance);
  };

  const speakQuestion = () => {
    if (flashcards.length > 0) {
      speak(flashcards[currentCard].question);
    }
  };

  const speakAnswer = () => {
    if (flashcards.length > 0) {
      speak(flashcards[currentCard].answer);
    }
  };

  const stopSpeaking = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
      setIsPlaying(false);
    }
  };

  const repeatCard = () => {
    setShowAnswer(false);
    speakQuestion();
  };

  // Navigation
  const nextCard = () => {
    if (currentCard < flashcards.length - 1) {
      setCurrentCard(currentCard + 1);
      setShowAnswer(false);
      setTimeout(() => speakQuestion(), 500);
    } else {
      speak("Study session complete! Great job!");
    }
  };

  const previousCard = () => {
    if (currentCard > 0) {
      setCurrentCard(currentCard - 1);
      setShowAnswer(false);
      setTimeout(() => speakQuestion(), 500);
    }
  };

  // Spaced repetition logic
  const markCard = async (correct) => {
    const card = flashcards[currentCard];
    const now = Date.now();

    // Update card statistics
    const updatedCard = {
      ...card,
      lastReviewed: now,
      correctCount: correct ? card.correctCount + 1 : card.correctCount,
      incorrectCount: correct ? card.incorrectCount : card.incorrectCount + 1,
      difficulty: correct
        ? Math.max(1, card.difficulty - 0.1)
        : Math.min(3, card.difficulty + 0.3),
    };

    // Calculate next review time (spaced repetition)
    const intervals = { 1: 1, 2: 3, 3: 7 }; // days
    const baseInterval = intervals[Math.floor(updatedCard.difficulty)] || 1;
    const interval = correct
      ? baseInterval * (updatedCard.correctCount + 1)
      : 1;
    updatedCard.nextReview = now + interval * 24 * 60 * 60 * 1000;

    // Update flashcards array
    const updatedCards = [...flashcards];
    updatedCards[currentCard] = updatedCard;
    setFlashcards(updatedCards);

    // Update stats
    const newStats = {
      ...studyStats,
      correct: correct ? studyStats.correct + 1 : studyStats.correct,
      incorrect: correct ? studyStats.incorrect : studyStats.incorrect + 1,
      total: studyStats.total + 1,
    };
    setStudyStats(newStats);

    // Save to IndexedDB
    await saveToIndexedDB("flashcards", {
      id: "current",
      cards: updatedCards,
      spacedRepetition,
    });
    await saveToIndexedDB("stats", { id: "current", ...newStats });

    speak(correct ? "Correct!" : "Let's review this one again.");

    if (autoAdvance) {
      setTimeout(() => nextCard(), 1500);
    }
  };

  // Export/Import data
  const exportData = () => {
    const data = {
      flashcards,
      spacedRepetition,
      studyStats,
      exportDate: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `echolearn-backup-${
      new Date().toISOString().split("T")[0]
    }.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Render different views
  const renderInputView = () => (
    <div className="max-w-4xl mx-auto p-6">
      <div className="text-center mb-8">
        <div className="flex items-center justify-center mb-4">
          <Brain className="w-12 h-12 text-blue-500 mr-3" />
          <h1 className="text-4xl font-bold text-gray-800">EchoLearn</h1>
        </div>
        <p className="text-gray-600 text-lg">
          Voice-Interactive Learning Companion
        </p>
        <p className="text-sm text-gray-500 mt-2">
          Privacy-first • No login required
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Paste your text to generate flashcards:
        </label>
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          className="w-full h-48 p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          placeholder="Paste an article, notes, or any text you want to study. EchoLearn will extract key concepts and create interactive flashcards with voice navigation..."
        />

        <div className="flex justify-between items-center mt-4">
          <p className="text-sm text-gray-500">
            {inputText.length} characters • Generates ~
            {Math.min(
              10,
              inputText.split(/[.!?]+/).filter((s) => s.trim().length > 10)
                .length
            )}{" "}
            flashcards
          </p>

          <button
            onClick={generateFlashcards}
            disabled={!inputText.trim() || loading} // ✅ Disable during loading
            className="flex items-center px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <>
                <svg className="animate-spin w-4 h-4 mr-2" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Generating...
              </>
            ) : (
              <>
                <FileText className="w-4 h-4 mr-2" />
                Generate Flashcards
              </>
            )}
          </button>
        </div>
      </div>

      {flashcards.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h3 className="font-medium text-green-800 mb-2">
            Previous Study Session Available
          </h3>
          <p className="text-green-700 text-sm mb-3">
            {flashcards.length} flashcards ready to review
          </p>
          <button
            onClick={() => {
              setCurrentView("study");
              setTimeout(() => speakQuestion(), 500);
            }}
            className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
          >
            Resume Studying
          </button>
        </div>
      )}
    </div>
  );

  const renderStudyView = () => {
    if (flashcards.length === 0) {
      return (
        <div className="text-center py-12">
          <p className="text-gray-500">
            No flashcards available. Generate some first!
          </p>
          <button
            onClick={() => setCurrentView("input")}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
          >
            Create Flashcards
          </button>
        </div>
      );
    }

    const card = flashcards[currentCard];
    const progress = ((currentCard + 1) / flashcards.length) * 100;

    return (
      <div className="max-w-3xl mx-auto p-6">
        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-600">
              Card {currentCard + 1} of {flashcards.length}
            </span>
            <span className="text-sm text-gray-600">
              {Math.round(progress)}% Complete
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Flashcard */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-6 min-h-64">
          <div className="text-center">
            <h2 className="text-xl font-medium text-gray-800 mb-6">
              {card.question}
            </h2>

            {showAnswer && (
              <div className="bg-blue-50 p-4 rounded-md mt-6">
                <p className="text-gray-700">{card.answer}</p>
              </div>
            )}

            {!showAnswer && (
              <button
                onClick={() => {
                  setShowAnswer(true);
                  speakAnswer();
                }}
                className="px-6 py-3 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
              >
                Show Answer
              </button>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap gap-4 justify-center mb-6">
          <button
            onClick={speakQuestion}
            className="flex items-center px-4 py-2 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
            disabled={isPlaying}
          >
            <Volume2 className="w-4 h-4 mr-2" />
            Question
          </button>

          {showAnswer && (
            <button
              onClick={speakAnswer}
              className="flex items-center px-4 py-2 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              disabled={isPlaying}
            >
              <Play className="w-4 h-4 mr-2" />
              Answer
            </button>
          )}

          <button
            onClick={repeatCard}
            className="flex items-center px-4 py-2 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Repeat
          </button>
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center">
          <button
            onClick={previousCard}
            disabled={currentCard === 0}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>

          {showAnswer && (
            <div className="flex gap-2">
              <button
                onClick={() => markCard(false)}
                className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
              >
                Incorrect
              </button>
              <button
                onClick={() => markCard(true)}
                className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
              >
                Correct
              </button>
            </div>
          )}

          <button
            onClick={nextCard}
            disabled={currentCard >= flashcards.length - 1}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      </div>
    );
  };

  const renderSettingsView = () => (
    <div className="max-w-2xl mx-auto p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Settings</h2>

      <div className="bg-white rounded-lg shadow-lg p-6 space-y-6">
        {/* Voice Settings */}
        <div>
          <h3 className="text-lg font-medium text-gray-800 mb-4">
            Voice Settings
          </h3>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">
                Voice Enabled
              </label>
              <button
                onClick={() => setVoiceEnabled(!voiceEnabled)}
                className={`w-12 h-6 rounded-full transition-colors ${
                  voiceEnabled ? "bg-blue-500" : "bg-gray-300"
                }`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full transition-transform ${
                    voiceEnabled ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">
                Speech Rate: {speechRate.toFixed(1)}x
              </label>
              <input
                type="range"
                min="0.5"
                max="2"
                step="0.1"
                value={speechRate}
                onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
                className="w-full"
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">
                Auto-advance after answer
              </label>
              <button
                onClick={() => setAutoAdvance(!autoAdvance)}
                className={`w-12 h-6 rounded-full transition-colors ${
                  autoAdvance ? "bg-blue-500" : "bg-gray-300"
                }`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full transition-transform ${
                    autoAdvance ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Study Stats */}
        <div>
          <h3 className="text-lg font-medium text-gray-800 mb-4">
            Study Statistics
          </h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-green-50 rounded-md">
              <div className="text-2xl font-bold text-green-600">
                {studyStats.correct}
              </div>
              <div className="text-sm text-green-700">Correct</div>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-md">
              <div className="text-2xl font-bold text-red-600">
                {studyStats.incorrect}
              </div>
              <div className="text-sm text-red-700">Incorrect</div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-md">
              <div className="text-2xl font-bold text-blue-600">
                {studyStats.total}
              </div>
              <div className="text-sm text-blue-700">Total</div>
            </div>
          </div>
        </div>

        {/* Data Management */}
        <div>
          <h3 className="text-lg font-medium text-gray-800 mb-4">
            Data Management
          </h3>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={exportData}
              className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
            >
              <Download className="w-4 h-4 mr-2" />
              Export Data
            </button>

            <button
              onClick={() => {
                if (confirm("Clear all data? This cannot be undone.")) {
                  setFlashcards([]);
                  setStudyStats({ correct: 0, incorrect: 0, total: 0 });
                  setSpacedRepetition({});
                  speak("All data cleared.");
                }
              }}
              className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
            >
              Clear All Data
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Brain className="w-8 h-8 text-blue-500 mr-2" />
              <span className="font-bold text-xl text-gray-800">EchoLearn</span>
            </div>

            <div className="flex space-x-1">
              <button
                onClick={() => setCurrentView("input")}
                className={`px-4 py-2 rounded-md transition-colors ${
                  currentView === "input"
                    ? "bg-blue-100 text-blue-700"
                    : "text-gray-600 hover:text-gray-800"
                }`}
              >
                Create
              </button>
              <button
                onClick={() => setCurrentView("study")}
                className={`px-4 py-2 rounded-md transition-colors ${
                  currentView === "study"
                    ? "bg-blue-100 text-blue-700"
                    : "text-gray-600 hover:text-gray-800"
                }`}
              >
                Study
              </button>
              <button
                onClick={() => setCurrentView("settings")}
                className={`px-4 py-2 rounded-md transition-colors ${
                  currentView === "settings"
                    ? "bg-blue-100 text-blue-700"
                    : "text-gray-600 hover:text-gray-800"
                }`}
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="py-8">
        {currentView === "input" && renderInputView()}
        {currentView === "study" && renderStudyView()}
        {currentView === "settings" && renderSettingsView()}
      </main>

      {/* Status Bar */}
      {(isListening || isPlaying) && (
        <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg p-4">
          <div className="flex items-center space-x-2">
            {isListening && (
              <div className="flex items-center text-green-600">
                <Mic className="w-4 h-4 mr-1 animate-pulse" />
                <span className="text-sm">Listening...</span>
              </div>
            )}
            {isPlaying && (
              <div className="flex items-center text-blue-600">
                <Volume2 className="w-4 h-4 mr-1 animate-pulse" />
                <span className="text-sm">Speaking...</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
