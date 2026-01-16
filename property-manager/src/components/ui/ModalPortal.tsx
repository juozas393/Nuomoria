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
  contentClassName?: string;
}

export function ModalPortal({ children, isOpen, onClose, contentClassName }: ModalPortalProps) {
  if (!portalRoot || !isOpen) return null;

  const baseClasses =
    "relative max-h-[min(85dvh,900px)] overflow-y-auto rounded-2xl bg-white shadow-xl";
  const contentClasses = contentClassName ? `${baseClasses} ${contentClassName}` : `${baseClasses} w-[min(1000px,96vw)]`;
  
  return createPortal(
    <div className="fixed inset-0 z-[2000] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className={contentClasses}>
        {children}
      </div>
    </div>,
    portalRoot
  );
}
