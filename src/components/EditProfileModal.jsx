import { useState, useEffect } from 'react';
import { updateProfile, deleteUser } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { getInitials } from '../utils/defaultAvatars';

export default function EditProfileModal({ isOpen, onClose, user, onProfileUpdated }) {
  const [displayName, setDisplayName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('');
  const [erro, setErro] = useState('');
  const [confirmarExclusao, setConfirmarExclusao] = useState(false);

  // As 3 imagens específicas que você colocou na pasta public
  const customAvatars = [
    { id: '1', url: '/roti-na/avatar1.png', name: 'Avatar 1' },
    { id: '2', url: '/roti-na/avatar2.png', name: 'Avatar 2' },
    { id: '3', url: '/roti-na/avatar3.png', name: 'Avatar 3' },
  ];

  useEffect(() => {
    if (user && isOpen) {
      setDisplayName(user.displayName || '');
      const savedAvatar = localStorage.getItem(`profile_avatar_${user.uid}`) || '';
      setSelectedAvatar(savedAvatar);
      setErro('');
      setConfirmarExclusao(false);
    }
  }, [user, isOpen]);

  if (!isOpen || !user) return null;

  const handleSalvar = async (e) => {
    e.preventDefault();
    setErro('');
    try {
      await updateProfile(user, {
        displayName: displayName.trim()
      });

      // Salva no Firestore para sincronizar na nuvem
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, {
        displayName: displayName.trim(),
        avatar: selectedAvatar || ''
      }, { merge: true });

      if (selectedAvatar) {
        localStorage.setItem(`profile_avatar_${user.uid}`, selectedAvatar);
      } else {
        localStorage.removeItem(`profile_avatar_${user.uid}`);
      }

      if (onProfileUpdated) onProfileUpdated();
      onClose();
    } catch (err) {
      setErro(err.message);
    }
  };

  const handleExcluirConta = async () => {
    if (!confirmarExclusao) {
      setConfirmarExclusao(true);
      return;
    }
    try {
      localStorage.removeItem(`profile_avatar_${user.uid}`);
      await deleteUser(user);
      onClose();
    } catch (err) {
      setErro('Erro ao excluir conta. Entre novamente na conta e tente de novo.');
    }
  };

  const userInitials = getInitials(displayName || user.email);

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 text-zinc-100 rounded-lg w-full max-w-md p-6 shadow-2xl">
        <h2 className="text-xl font-bold mb-4">Editar Perfil</h2>
        
        {erro && <div className="mb-4 p-3 bg-red-900/50 border border-red-500 rounded text-red-200 text-xs">{erro}</div>}

        <form onSubmit={handleSalvar} className="space-y-4">
          <div>
            <label className="block text-sm mb-1 text-zinc-400">Nome de usuário</label>
            <input 
              type="text" 
              value={displayName} 
              onChange={e => setDisplayName(e.target.value)} 
              placeholder="Seu nome" 
              className="w-full bg-zinc-950 border border-zinc-700 rounded p-2 focus:outline-none focus:border-zinc-500 text-zinc-100" 
            />
          </div>

          <div>
            <label className="block text-sm mb-2 text-zinc-400">Escolha o Avatar ou Iniciais</label>
            
            {/* CARROSSEL HORIZONTAL COM AVATARES GRANDES */}
            <div className="flex items-center gap-4 overflow-x-auto py-2 px-1 scrollbar-thin scrollbar-thumb-zinc-700">
              
              {/* Opção Iniciais */}
              <div 
                onClick={() => setSelectedAvatar('')}
                className={`w-20 h-20 rounded-full border-4 flex items-center justify-center cursor-pointer bg-zinc-800 text-zinc-200 font-bold text-xl shrink-0 transition-all ${!selectedAvatar ? 'border-white scale-105 shadow-lg' : 'border-zinc-700 opacity-60 hover:opacity-100'}`}
                title="Usar Iniciais"
              >
                {userInitials}
              </div>

              {/* Opções das 3 Imagens Personalizadas */}
              {customAvatars.map((avatar) => (
                <div 
                  key={avatar.id}
                  onClick={() => setSelectedAvatar(avatar.url)}
                  className={`w-20 h-20 rounded-full border-4 overflow-hidden cursor-pointer shrink-0 transition-all ${selectedAvatar === avatar.url ? 'border-white scale-105 shadow-lg' : 'border-zinc-700 opacity-60 hover:opacity-100'}`}
                  title={avatar.name}
                >
                  <img src={avatar.url} alt={avatar.name} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-zinc-800 mt-6">
            <button 
              type="button"
              onClick={handleExcluirConta}
              className={`text-xs font-medium px-3 py-2 rounded transition-colors ${confirmarExclusao ? 'bg-red-600 text-white' : 'text-red-500 hover:text-red-400'}`}
            >
              {confirmarExclusao ? 'Clique novamente para confirmar' : 'Excluir conta'}
            </button>

            <div className="flex gap-2">
              <button type="button" onClick={onClose} className="px-4 py-2 rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 text-sm">Cancelar</button>
              <button type="submit" className="px-5 py-2 bg-zinc-100 text-zinc-950 rounded hover:bg-zinc-300 font-medium text-sm">Salvar</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
