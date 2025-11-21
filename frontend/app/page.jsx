'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  const [roomInput, setRoomInput] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleJoin = (e) => {
    e.preventDefault();
    const id = roomInput.trim();
    if (!id) {
      setError('Please enter a room ID');
      return;
    }
    setIsLoading(true);
    setTimeout(() => {
      router.push(`/board/${id}`);
    }, 300);
  };

  return (
    <div className="min-h-screen bg-[url('/bg-7.jpg')] bg-cover bg-center bg-fixed">
      <div className="w-full h-screen overflow-hidden md:flex justify-center">
        <div className="flex items-center justify-center">
          <h1 className="text-6xl md:text-7xl font-black text-transparent bg-linear-to-r from-white via-grey-500 to-zinc-800 bg-clip-text">
            Collaborative Whiteboard
          </h1>
        </div> 
        {/* Content */}
        <div className="relative w-full text-center md:flex md:flex-col items-center justify-center">
            {/* Header */}
            <div>
              <p className="text-2xl md:text-3xl font-black text-transparent bg-linear-to-r from-zinc-800 via-white to-zinc-800 bg-clip-text mb-2">
                Draw, collaborate, and create together in real-time
              </p>
              <p className="text-lg font-black text-transparent bg-linear-to-r from-zinc-800 via-white to-zinc-800 bg-clip-text mb-6">
                Works instantly • No setup required • Share with anyone
              </p>
            </div>

            {/* Main Section - Centered Form */}
            <div>
              <div className="bg-white/5 border border-zinc-700 rounded-3xl px-10 py-5 flex items-center justify-center backdrop-blur-md">
                  {/* Form */}
                  <form onSubmit={handleJoin} className="space-y-6">
                    <div>
                      <label className="block text-lg font-semibold text-white mb-4">
                        Enter Room ID
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={roomInput}
                          onChange={(e) => {
                            setRoomInput(e.target.value);
                            setError('');
                          }}
                          placeholder="e.g., team, design"
                          className="w-full px-6 py-4 text-lg bg-white/10 border-2 border-white/20 rounded-2xl text-white placeholder-zinc"
                          autoFocus
                          disabled={isLoading}
                        />
                      </div>
                      {error && (
                        <div className="mt-3 p-4 bg-red-500/20 border border-red-500/30 rounded-lg flex items-center gap-3">
                          <svg className="w-5 h-5 text-red-400 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                          </svg>
                          <span className="text-sm text-red-300">{error}</span>
                        </div>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-4 px-6 text-lg bg-blue-600 disabled:opacity-50 text-white font-semibold rounded-2xl flex items-center justify-center gap-3 group"
                    >
                      {isLoading ? (
                        <>
                          <svg className="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          <span>Joining...</span>
                        </>
                      ) : (
                        <>
                          <span>Join Room</span>
                          <svg className="w-6 h-6 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                          </svg>
                        </>
                      )}
                    </button>
                  </form>
                </div>
              </div>
        </div>
      </div>
    </div>
  );
}

