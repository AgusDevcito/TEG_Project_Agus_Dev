import { useState } from 'react';
import { GameHud } from '../components/HUD/GameHud.tsx';
import { MainMenu } from '../components/Menu/MainMenu.tsx';
import { ProfileModal } from '../components/Profile/ProfileModal.tsx';
import { SettingsModal } from '../components/Settings/SettingsModal.tsx';
import { ShopModal } from '../components/Shop/ShopModal.tsx';
import { TutorialModal } from '../components/Tutorial/TutorialModal.tsx';
import { GameScene } from '../scenes/GameScene.tsx';
import { useGameStore } from '../stores/gameStore.ts';
import { useProfileStore } from '../stores/profileStore.ts';
import { useTutorialStore } from '../stores/tutorialStore.ts';
import { PLAYER_COLORS } from '../types/game.ts';

export default function App() {
  const hasGame = useGameStore((s) => s.game !== null);
  const newGame = useGameStore((s) => s.newGame);
  const profile = useProfileStore((s) => s.profile);
  const startGuidedPractice = useTutorialStore((s) => s.startGuidedPractice);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const [tutorialOpen, setTutorialOpen] = useState(false);

  const handleStartGuidedMatch = () => {
    const botColor =
      PLAYER_COLORS.find((c) => c !== profile.favoriteColor) ?? 'blue';
    newGame([
      {
        id: 'p1',
        name: profile.username || 'Comandante',
        color: profile.favoriteColor,
        isBot: false,
      },
      {
        id: 'bot_instructor',
        name: 'Bot Instructor',
        color: botColor,
        isBot: true,
      },
    ]);
    startGuidedPractice();
    setTutorialOpen(false);
  };

  return (
    <div className="app">
      <GameScene />
      {hasGame ? (
        <GameHud
          onOpenSettings={() => setSettingsOpen(true)}
          onOpenShop={() => setShopOpen(true)}
          onOpenTutorial={() => setTutorialOpen(true)}
        />
      ) : (
        <MainMenu
          onOpenSettings={() => setSettingsOpen(true)}
          onOpenProfile={() => setProfileOpen(true)}
          onOpenShop={() => setShopOpen(true)}
          onOpenTutorial={() => setTutorialOpen(true)}
        />
      )}
      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onOpenShop={() => {
          setSettingsOpen(false);
          setShopOpen(true);
        }}
      />
      <ProfileModal
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        onOpenShop={() => setShopOpen(true)}
      />
      <ShopModal open={shopOpen} onClose={() => setShopOpen(false)} />
      <TutorialModal
        open={tutorialOpen}
        inActiveMatch={hasGame}
        onClose={() => setTutorialOpen(false)}
        onStartGuidedMatch={handleStartGuidedMatch}
      />
    </div>
  );
}
