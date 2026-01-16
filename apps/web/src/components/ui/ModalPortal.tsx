import React from 'react';
import { createPortal } from "react-dom";

const portalRoot = (() => {
  if (typeof document === "undefined") return null;
  let el = document.getElementById("modal-root");
  if (!el) { 
    el = document.createElement("div"); 
    el.id = "modal-root"; 
    document.body.appendChild(el); 
  }
  return el;
})();

interface ModalPortalProps {
  children: React.ReactNode;
  isOpen: boolean;
  onClose: () => void;
}

export function ModalPortal({ children, isOpen, onClose }: ModalPortalProps) {
  if (!portalRoot || !isOpen) return null;
  
  return createPortal(
    <div className="fixed inset-0 z-[2000]">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
                      w-[min(1000px,96vw)] max-h-[min(85dvh,900px)]
                      overflow-y-auto rounded-2xl bg-white shadow-xl">
        {children}
      </div>
    </div>,
    portalRoot
  );
}
