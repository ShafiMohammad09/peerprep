
import React from 'react';
import { useAppContext } from '../context/AppContext';
import { GoogleIcon } from './icons';

const Login: React.FC = () => {
  const { login } = useAppContext();

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-full max-w-sm p-8 space-y-6 bg-white rounded-lg shadow-md">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">PeerPrep</h1>
          <p className="mt-2 text-sm text-slate-600">
            Practice mock interviews with peers from around the world.
          </p>
        </div>
        <button
          onClick={login}
          className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white border border-slate-300 rounded-md shadow-sm text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
          aria-label="Sign in with Google"
        >
          <GoogleIcon />
          <span>Sign in with Google</span>
        </button>
        <p className="text-xs text-center text-slate-500">
          Sign in to book your first mock interview slot.
        </p>
      </div>
    </div>
  );
};

export default Login;
