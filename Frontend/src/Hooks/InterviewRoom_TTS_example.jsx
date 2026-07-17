// Pages/InterviewRoom.jsx  (example — merge this into your existing file)
//
// Shows exactly how useTextToSpeech plugs into your interview flow:
// question loads -> AI speaks it -> user answers.

import { useEffect, useState } from 'react';
import useTextToSpeech from '../Hooks/useTextToSpeech';

function InterviewRoom() {
  const { speak, stopSpeaking, isSpeaking } = useTextToSpeech();

  // Replace this with your real question source (state/props/API)
  const [currentQuestion, setCurrentQuestion] = useState(
    "Tell me about yourself."
  );

  // Speak automatically whenever the question changes
  useEffect(() => {
    speak(currentQuestion);

    // stop speaking if the user leaves this page
    return () => stopSpeaking();
  }, [currentQuestion]);

  return (
    <div className="interview-room">
      <h2>{currentQuestion}</h2>

      <button onClick={() => speak(currentQuestion)} disabled={isSpeaking}>
        {isSpeaking ? "Speaking..." : "🔊 Repeat Question"}
      </button>

      {/* Your existing recording / answer UI goes below this */}
      {/* <AnswerRecorder question={currentQuestion} /> */}
    </div>
  );
}

export default InterviewRoom;
