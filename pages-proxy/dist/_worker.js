// Reenvía cada petición al Worker del Hall of Fame (misma cuenta, sin salir a Internet).
export default {
  async fetch(request, env) {
    return env.HOF.fetch(request);
  },
};
