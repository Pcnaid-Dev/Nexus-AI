import React from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { Hexagon, ShieldCheck, Zap, Globe } from 'lucide-react';

const LoginPage: React.FC = () => {
  const { loginWithRedirect } = useAuth0();

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/20 rounded-full blur-[100px]"></div>
      </div>

      <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700 p-8 md:p-12 rounded-3xl shadow-2xl max-w-md w-full relative z-10">
        <div className="text-center mb-10">
          <div className="flex justify-center mb-6">
            <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-4 rounded-2xl shadow-lg">
              <Hexagon className="w-10 h-10 text-white fill-current" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white mb-3 tracking-tight">Nexus Workspace</h1>
          <p className="text-slate-400">Secure, AI-powered collaboration for your team and family.</p>
        </div>

        <div className="space-y-6">
          <button 
            onClick={() => loginWithRedirect()}
            className="w-full bg-white text-slate-800 font-bold py-3.5 px-6 rounded-xl hover:bg-slate-50 transition-all transform hover:scale-[1.02] shadow-lg flex items-center justify-center space-x-3 group"
          >
            <img 
              src="https://www.google.com/favicon.ico" 
              alt="Google" 
              className="w-5 h-5"
            />
            <span>Sign in with Google</span>
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-700"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-transparent text-slate-500">Secure Access</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 text-center">
             <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
                <ShieldCheck className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
                <p className="text-[10px] text-slate-400 font-medium">Enterprise Security</p>
             </div>
             <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
                <Zap className="w-6 h-6 text-amber-400 mx-auto mb-2" />
                <p className="text-[10px] text-slate-400 font-medium">Real-time Sync</p>
             </div>
             <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
                <Globe className="w-6 h-6 text-blue-400 mx-auto mb-2" />
                <p className="text-[10px] text-slate-400 font-medium">Cloud Context</p>
             </div>
          </div>
        </div>
        
        <p className="mt-8 text-center text-xs text-slate-500">
          By continuing, you agree to the Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
};

export default LoginPage;