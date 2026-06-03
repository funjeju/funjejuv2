"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/common/Button";

type ModalProps = {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
};

export function Modal({ open, title, children, onClose }: ModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-text-primary/40 p-4 sm:items-center">
      <div className="w-full max-w-lg rounded-panel border border-border-soft bg-bg-primary p-5 shadow-soft">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">{title}</h2>
            <p className="mt-1 text-sm leading-6 text-text-secondary">공통 모달 프레임입니다. 실제 액션은 이후 기능 단계에서 연결합니다.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border-soft text-text-secondary"
            aria-label="닫기"
          >
            ×
          </button>
        </div>
        <div className="py-4">{children}</div>
        <div className="flex justify-end">
          <Button variant="secondary" onClick={onClose}>
            닫기
          </Button>
        </div>
      </div>
    </div>
  );
}
