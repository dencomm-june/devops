import { useState } from 'react';

export default function Home() {
  const [isRunning, setIsRunning] = useState(false);

  const handleStart = async () => {
    const res = await fetch('/api/start');
    const data = await res.text();
    alert(data);
    setIsRunning(true);
  };

  const handleStop = async () => {
    const res = await fetch('/api/stop');
    const data = await res.text();
    alert(data);
    setIsRunning(false);
  };

  return (
    <div style={{ textAlign: 'center', marginTop: '50px' }}>
      <h1>버스 좌석 정보 수집기</h1>
      <button onClick={handleStart} disabled={isRunning} style={{ marginRight: '10px', padding: '10px 20px' }}>
        Start
      </button>
      <button onClick={handleStop} disabled={!isRunning} style={{ padding: '10px 20px' }}>
        Stop
      </button>
    </div>
  );
}
