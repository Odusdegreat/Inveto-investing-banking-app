import type { StepUpAction } from "@/src/api/client";
import { router } from "expo-router";

/**
 * Step-up confirmation coordinator.
 *
 * The transaction PIN is NOT a sign-in credential. It re-confirms identity for
 * one sensitive action (moving money, changing credentials, downgrading
 * security). The PIN screen pushes itself, verifies the PIN against the API,
 * and resolves the awaiting action with a single-use token.
 *
 * A module-level promise is used rather than router params so the calling
 * screen can `await` the result without knowing which screen the user went to.
 */

type Pending = {
  resolve: (token: string | null) => void;
  reason: string;
  action: StepUpAction;
};

let pending: Pending | null = null;

/**
 * Pushes the PIN screen and resolves with a single-use step-up token, or `null`
 * if the user cancelled, went back, or failed verification.
 */
export function confirmStepUp(action: StepUpAction, reason: string): Promise<string | null> {
  // The confirmation screen is modal, so two requests cannot legitimately
  // overlap. Fail the newcomer rather than stacking screens.
  if (pending) return Promise.resolve(null);

  return new Promise<string | null>((resolve) => {
    pending = { resolve, reason, action };
    router.push({ pathname: "/pin", params: { reason } });
  });
}

/** Called by the PIN screen when verification succeeds. */
export function resolveStepUp(token: string) {
  const current = pending;
  pending = null;
  current?.resolve(token);
}

/** Called by the PIN screen when the user backs out or cancels. */
export function cancelStepUp() {
  const current = pending;
  pending = null;
  current?.resolve(null);
}

export function hasPendingStepUp() {
  return pending !== null;
}

export function pendingStepUpAction() { return pending?.action; }
