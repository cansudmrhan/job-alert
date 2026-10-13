"use client";

import type { ReactNode } from "react";

type ModalProps = {
  onClose: () => void;
  children: ReactNode;
};

export default function Modal({ onClose, children }: ModalProps) {
  return (
    <div
      className="fixed inset-0 z-10 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
