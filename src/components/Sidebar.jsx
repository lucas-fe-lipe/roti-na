import { useState, useEffect } from 'react';
import { auth } from '../services/firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import EditProfileModal from './EditProfileModal';
import { getInitials } from '../utils/defaultAvatars';

export default function Sidebar({ isOpen, onClose, user, onProfileUpdated }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [erro, setErro] = useState('');
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [userAvatar, setUserAvatar] = useState('');

  useEffect(() => {
    if (user) {
      const savedAvatar = localStorage.getItem(`profile_avatar_${user.uid}`) || '';
      setUserAvatar(savedAvatar);
    }
  }, [user, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro('');
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
      onClose();
    } catch (err) {
      setErro(err.message);
    }
  };

  const handleGoogleLogin = async () => {
    setErro('');
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      onClose();
    } catch (err) {
      setErro(err.message);
    }
  };

  const userName = user ? (user.displayName || user.email.split('@')[0]) : '';
  const userInitials = getInitials(userName || user?.email);

  return (
    <>
      {isOpen && <div className="fixed inset-0 bg-black/50 z-40 transition-opacity" onClick={onClose}></div>}
      <div className={`fixed top-0 left-0 h-full w-80 bg-zinc-900 border-r border-zinc-800 z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        
        <div className="flex justify-between items-center p-6 border-b border-zinc-800">
          <h2 className="text-xl font-bold text-zinc-100">{user ? 'Conta' : (isLogin ? 'Entrar' : 'Registar')}</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-white text-3xl leading-none font-light">&times;</button>
        </div>

        <div className="p-6 flex-1 flex flex-col gap-5">
          {user ? (
            <div className="flex flex-col gap-6">
              <div className="flex items-center gap-3 p-3 bg-zinc-950 rounded-lg border border-zinc-800">
                <div className="w-10 h-10 rounded-full border-2 border-zinc-700 flex items-center justify-center overflow-hidden bg-zinc-800 text-zinc-200 font-bold text-xs shrink-0">
                  {userAvatar ? (
                    <div className="w-full h-full" dangerouslySetInnerHTML={{ __html: userAvatar }} />
                  ) : (
                    <span>{userInitials}</span>
                  )}
                </div>
                <div className="overflow-hidden">
                  <span className="text-sm font-medium text-zinc-100 truncate block">{userName}</span>
                  <span className="text-xs text-zinc-500 truncate block">{user.email}</span>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <button 
                  onClick={() => setIsEditProfileOpen(true)}
                  className="w-full text-left px-4 py-2.5 rounded bg-zinc-800/50 hover:bg-zinc-800 text-sm text-zinc-200 transition-colors flex items-center justify-between"
                >
                  <span>Editar perfil</span>
                  <span className="text-zinc-500">›</span>
                </button>

                <button 
                  onClick={() => { signOut(auth); onClose(); }}
                  className="w-full text-left px-4 py-2.5 rounded bg-red-950/30 hover:bg-red-900/40 text-sm text-red-400 transition-colors mt-2"
                >
                  Sair da conta
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex bg-zinc-950 rounded p-1 mb-2">
                <button type="button" onClick={() => setIsLogin(true)} className={`flex-1 py-2 text-sm rounded transition-colors ${isLogin ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>Entrar</button>
                <button type="button" onClick={() => setIsLogin(false)} className={`flex-1 py-2 text-sm rounded transition-colors ${!isLogin ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>Registar</button>
              </div>

              {erro && <div className="p-2 bg-red-900/50 border border-red-500 rounded text-red-200 text-xs">{erro}</div>}

              <button 
                type="button" 
                onClick={handleGoogleLogin}
                className="w-full bg-zinc-100 text-zinc-950 py-2.5 rounded hover:bg-zinc-300 font-medium transition-colors flex items-center justify-center gap-2 text-sm"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                Entrar com o Google
              </button>

              <div className="flex items-center my-1">
                <div className="flex-1 border-t border-zinc-800"></div>
                <span className="px-3 text-xs text-zinc-500">ou com e-mail</span>
                <div className="flex-1 border-t border-zinc-800"></div>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div>
                  <label className="block text-sm mb-1 text-zinc-400">E-mail</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" required className="w-full bg-zinc-950 border border-zinc-700 rounded p-2 focus:outline-none focus:border-zinc-500 text-zinc-100" />
                </div>
                
                <div>
                  <label className="block text-sm mb-1 text-zinc-400">Palavra-passe</label>
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required className="w-full bg-zinc-950 border border-zinc-700 rounded p-2 focus:outline-none focus:border-zinc-500 text-zinc-100" />
                </div>

                <button type="submit" className="w-full bg-zinc-800 text-zinc-100 py-2.5 rounded hover:bg-zinc-700 font-medium transition-colors">
                  {isLogin ? 'Entrar' : 'Registar'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>

      <EditProfileModal isOpen={isEditProfileOpen} onClose={() => setIsEditProfileOpen(false)} user={user} onProfileUpdated={onProfileUpdated} />
    </>
  );
}