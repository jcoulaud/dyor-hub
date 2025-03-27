"use client";

import React, { useRef, useState } from "react";
import QRCode from "react-qr-code";
import Image from 'next/image';
import { toPng } from "html-to-image";
import { FiDownload, FiCopy } from "react-icons/fi";

const TokenShareLink = ({ address }: { address: string }) => {
    console.log("QRCode is", QRCode);
  const baseUrl = process.env.NEXT_PUBLIC_URL || 'https://dyorhub.xyz'; 
  const fullUrl = `${baseUrl}/tokens/${address}`;
  const qrRef = useRef<HTMLDivElement>(null);
  const [htmlSnippet, setHtmlSnippet] = useState("");

  const downloadQRCode = async () => {
    if (!qrRef.current) return;

    const dataUrl = await toPng(qrRef.current, { cacheBust: true });
    const base64 = dataUrl.replace(/^data:image\/png;base64,/, "");
    const snippet = `<a href="${fullUrl}">\n  <img src="data:image/png;base64,${base64}" alt="QR Code" />\n</a>`;
    setHtmlSnippet(snippet);

    const link = document.createElement("a");
    link.download = `qrcode-${address}.png`;
    link.href = dataUrl;
    link.click();
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(htmlSnippet);
  };

  return (
    <div className="flex flex-col items-center p-4 bg-white rounded-xl shadow">
      <button
        onClick={downloadQRCode}
        title="Download"
        className="absolute top-5 right-10 text-gray-500 hover:text-blue-600 transition"
      >
      <FiDownload size={18} />
      </button>
      <div ref={qrRef} className="bg-white p-4 rounded">
        <p className="mb-2 text-sm text-gray-700">Scan to discuss</p>
        <QRCode value={fullUrl} size={150} />
        <p className="mt-2 text-xs text-gray-500 break-all">
          <Image
                        onClick={downloadQRCode}
                        src='/logo.png'
                        alt='DYOR hub'
                        width={140}
                        height={40}
                        className='h-auto w-auto'
                        priority
          />
         </p>
       </div>
       {htmlSnippet && (
        <div className="mt-4 w-full">
         <div className="relative">
          <label className="text-sm font-medium text-gray-700 mb-1 block">
            HTML snippet:
            
          </label>
          
          <button
              onClick={copyToClipboard}
              className="absolute top-0 right-0 text-gray-500 hover:text-blue-600"
              title="Copy to clipboard"
            >
              <FiCopy size={16} />
            </button>
            <textarea
              value={htmlSnippet}
              readOnly
              rows={4}
              className="w-full font-mono text-sm p-2 border rounded resize-none bg-gray-400"
            />
            
          </div>
        </div>
      )}
    </div>
  );
};

export default TokenShareLink;
