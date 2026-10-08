"use client";

import { useState } from "react";
import { Share2, Facebook, MessageCircle, Twitter, Copy, Check } from "lucide-react";

interface ShareButtonsProps {
  url: string;
  title: string;
}

export default function ShareButtons({ url, title }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);

  const fullUrl = typeof window !== "undefined" ? window.location.href : url;

  const handleCopy = () => {
    navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareFacebook = () => {
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(fullUrl)}`,
      "_blank",
      "width=600,height=400"
    );
  };

  const shareWhatsApp = () => {
    window.open(
      `https://api.whatsapp.com/send?text=${encodeURIComponent(title + " " + fullUrl)}`,
      "_blank"
    );
  };

  const shareTwitter = () => {
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(fullUrl)}`,
      "_blank",
      "width=600,height=400"
    );
  };

  return (
    <div className="flex items-center gap-2 py-4 border-y border-slate-200 text-sm">
      <span className="flex items-center gap-1 font-bold text-slate-700 mr-2">
        <Share2 className="w-4 h-4 text-brand-600" />
        <span>শেয়ার করুন:</span>
      </span>

      <button
        onClick={shareFacebook}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#1877F2] text-white hover:bg-blue-700 transition-colors text-xs font-semibold"
        title="ফেসবুকে শেয়ার করুন"
      >
        <Facebook className="w-3.5 h-3.5 fill-current" />
        <span className="hidden sm:inline">Facebook</span>
      </button>

      <button
        onClick={shareWhatsApp}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#25D366] text-white hover:bg-emerald-600 transition-colors text-xs font-semibold"
        title="হোয়াটসঅ্যাপে শেয়ার করুন"
      >
        <MessageCircle className="w-3.5 h-3.5 fill-current" />
        <span className="hidden sm:inline">WhatsApp</span>
      </button>

      <button
        onClick={shareTwitter}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900 text-white hover:bg-black transition-colors text-xs font-semibold"
        title="টুইটারে (X) শেয়ার করুন"
      >
        <Twitter className="w-3.5 h-3.5 fill-current" />
        <span className="hidden sm:inline">X</span>
      </button>

      <button
        onClick={handleCopy}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors text-xs font-semibold ml-auto"
        title="সংবাদের লিংক কপি করুন"
      >
        {copied ? (
          <>
            <Check className="w-3.5 h-3.5 text-emerald-600" />
            <span className="text-emerald-700 font-bold">কপি হয়েছে!</span>
          </>
        ) : (
          <>
            <Copy className="w-3.5 h-3.5" />
            <span>লিংক কপি</span>
          </>
        )}
      </button>
    </div>
  );
}
