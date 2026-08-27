import { createEffect, createSignal } from "solid-js";

export interface User {
  id: string;
  name: string;
}

export function useUser() {
  const [user, setUser] = createSignal<User | null>(null);

  createEffect(() => {
    // Simulate a network request
    new Promise((resolve) => setTimeout(resolve, 1000)).then(() => {
      setUser({
        id: Math.random() < 0.5 ? "1" : "2",
        name: "John Doe",
      });
    });
  });

  return user;
}
