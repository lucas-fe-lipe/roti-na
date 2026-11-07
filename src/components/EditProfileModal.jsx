import { useState } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../services/firebase';

export default function EditProfileModal({ isOpen, onClose, user, currentAvatar, currentName, onProfileUpdated }) {
  const [name, setName] = useState(currentName || '');
  const [selectedAvatar, setSelectedAvatar] = useState(currentAvatar || '');

  if (!isOpen) return null;

  const avatars = ['avatar1.png', 'avatar2.png', 'avatar3.png'];

  const handleSave = async (e) => {
    e.preventDefault();
    
    if (user) {
      // Salva no Firestore na coleção de usuários
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, { 
        displayName: name, 
        avatar: selectedAvatar 
      }, { merge: true });
    }

    // Salva localmente para persistência imediata
    if (user) {
      localStorage.setItem(`profile_avatar_${user.uid}`, selectedAvatar);
      localStorage.setItem(`profile_name_${user.uid}`, name);
    } else {
      localStorage.setItem('local_avatar', selectedAvatar);
      localStorage.setItem('local_name', name);
    }

    if (onProfileUpdated) {
      onProfileUpdated();
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 text-zinc-100 rounded-xl w-full max-w-sm p-6 shadow-2xl border border-zinc-800 space-y-4">
        <h2 className="text-lg font-bold">Editar Perfil</h2>
        
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Nome</label>
            <input 
              type="text" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              className="w-full bg-zinc-950 border border-zinc-700 rounded p-2 text-white text-sm"
            />
          </div>

          <div>
            <label className="block text-xs text-zinc-400 mb-2">Escolha um Avatar</label>
            <div className="flex gap-3 justify-center">
              {avatars.map((avatar, idx) => (
                <div 
                  key={idx}
                  onClick={() => setSelectedAvatar(`/${avatar}`)}
                  className={`w-12 h-12 rounded-full overflow-hidden border-2 cursor-pointer transition-all flex items-center justify-center bg-zinc-800 ${selectedAvatar === `/${avatar}` ? 'border-blue-500 scale-105' : 'border-transparent opacity-60 hover:opacity-100'}`}
                >
                  <img src={`/${avatar}`} alt={`Avatar ${idx + 1}`} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded text-zinc-400 hover:bg-zinc-800 text-sm">Cancelar</button>
            <button type="submit" className="px-4 py-2 bg-zinc-100 text-zinc-950 rounded hover:bg-zinc-300 font-medium text-sm">Salvar</button>
          </div>
        </form>
      </div>
    </div>
  );
}
