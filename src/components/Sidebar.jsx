import { useState, useEffect } from 'react';
import EditProfileModal from './EditProfileModal';
import { auth, db } from '../services/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { signOut, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { getInitials } from '../utils/defaultAvatars';

export default function Sidebar({ isOpen, onClose, user, onProfileUpdated }) {
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [avatar, setAvatar] = useState('');
  const [displayName, setDisplayName] = useState('');

  const fetchUserData = () => {
    if (user) {
      const savedAvatar = localStorage.getItem(`profile_avatar_${user.uid}`) || user.photoURL || '';
      const savedName = localStorage.getItem(`profile_name_${user.uid}`) || user.displayName || user.email.split('@')[0];
      setAvatar(savedAvatar);
      setDisplayName(savedName);
    } else {
      setAvatar(localStorage.getItem('local_avatar') || '');
      setDisplayName(localStorage.getItem('local_name') || 'Visitante');
    }
  };

  useEffect(() => {
    fetchUserData();
    if (!user) return;

    // Escuta em tempo real as alterações do perfil no Firestore
    const unsubscribe = onSnapshot(doc(db, 'users', user.uid), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.avatar) {
          setAvatar(data.avatar);
          localStorage.setItem(`profile_avatar_${user.uid}`, data.avatar);
        }
        if (data.displayName) {
          setDisplayName(data.displayName);
          localStorage.setItem(`profile_name_${user.uid}`, data.displayName);
        }
      }
    });

    return () => unsubscribe();
  }, [user]);

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      onClose();
    } catch (error) {
      console.error('Erro no login:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      onClose();
    } catch (error) {
      console.error('Erro ao sair:', error);
    }
  };

  if (!isOpen) return null;

  const initials = getInitials(displayName);
  const isImage = avatar.startsWith('http') || avatar.startsWith('/');

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-xs" onClick={onClose}></div>
      
      <div className="relative w-72 bg-zinc-950 border-r border-zinc-800 text-zinc-100 flex flex-col justify-between h-full z-10 shadow-2xl p-5">
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-base font-bold">Menu</h2>
            <button onClick={onClose} className="text-zinc-400 hover:text-white text-lg">×</button>
          </div>

          <div className="flex items-center gap-3 p-3 bg-zinc-900 border border-zinc-800 rounded-xl mb-6">
            <div className="w-10 h-10 rounded-full border border-zinc-700 flex items-center justify-center overflow-hidden bg-zinc-800 font-bold text-xs shrink-0">
              {avatar && isImage ? (
                <img src={avatar} alt="Perfil" className="w-full h-full object-cover" />
              ) : (
                <span>{initials}</span>
              )}
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-sm font-semibold truncate">{displayName}</span>
              <span className="text-[10px] text-zinc-400 truncate">{user ? user.email : 'Modo Offline'}</span>
            </div>
          </div>

          <div className="space-y-1">
            <button 
              onClick={() => setIsEditProfileOpen(true)}
              className="w-full text-left px-3 py-2 rounded-lg text-sm text-zinc-300 hover:bg-zinc-900 hover:text-white transition-colors flex items-center gap-2"
            >
              <span>⚙️</span> Editar Perfil
            </button>
          </div>
        </div>

        <div className="pt-4 border-t border-zinc-800">
          {user ? (
            <button 
              onClick={handleLogout}
              className="w-full py-2 bg-red-950/40 hover:bg-red-900/40 text-red-400 border border-red-900/50 rounded-lg text-xs font-semibold transition-colors"
            >
              Sair da Conta
            </button>
          ) : (
            <button 
              onClick={handleGoogleLogin}
              className="w-full py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-2"
            >
              Entrar com Google
            </button>
          )}
        </div>
      </div>

      <EditProfileModal 
        isOpen={isEditProfileOpen}
        onClose={() => setIsEditProfileOpen(false)}
        user={user}
        currentAvatar={avatar}
        currentName={displayName}
        onProfileUpdated={() => {
          fetchUserData();
          if (onProfileUpdated) onProfileUpdated();
        }}
      />
    </div>
  );
}
