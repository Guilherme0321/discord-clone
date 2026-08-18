import { useAuthStore } from "./store/useAuthStore";
import { LoginScreen } from "./components/auth/LoginScreen";
import { AppLayout } from "./components/layout/AppLayout";
import { VoiceAudioSinks } from "./components/voice/VoiceAudioSinks";

function App() {
  const user = useAuthStore((state) => state.user);

  if (!user) return <LoginScreen />;

  return (
    <>
      <AppLayout />
      {/* Nível raiz: o áudio da chamada de voz precisa sobreviver à troca de
          canal/servidor. Ver regra em VoiceAudioSinks.tsx. */}
      <VoiceAudioSinks />
    </>
  );
}

export default App;
