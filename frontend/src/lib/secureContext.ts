// navigator.mediaDevices (getUserMedia/getDisplayMedia) só existe em secure
// contexts (HTTPS ou localhost). Em HTTP puro a API inteira é `undefined` —
// não é uma permissão negada, é a feature ausente. Centralizamos a checagem
// aqui para que qualquer tela que precise de mídia (voz, tela) reaja da
// mesma forma, sem duplicar a lógica.
export function isMediaDevicesAvailable(): boolean {
  return typeof window !== "undefined" && window.isSecureContext && !!navigator.mediaDevices;
}

export const INSECURE_CONTEXT_MESSAGE =
  "O microfone/tela só pode ser usado em uma conexão segura (HTTPS). Acesse o app por HTTPS para liberar esse recurso.";
