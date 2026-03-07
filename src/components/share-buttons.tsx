"use client";

import { useState } from "react";
import { Share2, Check, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type ShareButtonsProps = {
  url: string;
  title: string;
  text?: string;
  /** 表示モード: inline=横並び, dropdown=ドロップダウン */
  mode?: "inline" | "dropdown";
  /** シェアボタン押下時のコールバック */
  onShare?: () => void;
};

export function ShareButtons({ url, title, text, mode = "dropdown", onShare }: ShareButtonsProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [copied, setCopied] = useState(false);

  const shareText = text ?? title;
  const encodedUrl = encodeURIComponent(url);
  const encodedText = encodeURIComponent(`${shareText}\n`);

  const shareLinks = [
    {
      name: "X",
      icon: (
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      ),
      href: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
    },
    {
      name: "LINE",
      icon: (
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="#06C755">
          <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
        </svg>
      ),
      href: `https://social-plugins.line.me/lineit/share?url=${encodedUrl}`,
    },
  ];

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  }

  async function handleNativeShare() {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, text: shareText, url });
      } catch {
        // user cancelled
      }
    } else {
      setShowMenu((prev) => !prev);
    }
  }

  if (mode === "inline") {
    return (
      <div className="flex items-center gap-2">
        {shareLinks.map((link) => (
          <a
            key={link.name}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background transition-colors hover:bg-accent"
            title={`${link.name}でシェア`}
            onClick={() => onShare?.()}
          >
            {link.icon}
          </a>
        ))}
        <button
          onClick={() => { handleCopy(); onShare?.(); }}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background transition-colors hover:bg-accent"
          title="リンクをコピー"
        >
          {copied ? <Check className="h-4 w-4 text-green-600" /> : <Link2 className="h-4 w-4" />}
        </button>
      </div>
    );
  }

  // dropdown mode
  return (
    <div className="relative">
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleNativeShare}>
        {copied ? <Check className="h-4 w-4 text-green-600" /> : <Share2 className="h-4 w-4" />}
      </Button>

      {showMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
          <div className="absolute right-0 top-full z-50 mt-1 w-44 rounded-lg border border-border bg-background p-2 shadow-lg">
            {shareLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setShowMenu(false)}
                className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent"
              >
                {link.icon}
                <span>{link.name}でシェア</span>
              </a>
            ))}
            <button
              onClick={() => { handleCopy(); setShowMenu(false); }}
              className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent"
            >
              <Link2 className="h-4 w-4" />
              <span>リンクをコピー</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
