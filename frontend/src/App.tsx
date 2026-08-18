import { useAuthStore } from "./store/useAuthStore";
import { LoginScreen } from "./components/auth/LoginScreen";
import { AppLayout } from "./components/layout/AppLayout";

function App() {
  const user = useAuthStore((state) => state.user);

  return user ? <AppLayout /> : <LoginScreen />;
}

export default App;
