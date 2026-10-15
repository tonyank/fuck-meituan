import React from 'react';

/**
 * High-fidelity SVG graphics for the Whac-A-Mole characters and game elements
 * Based on the user's uploaded images and game video:
 * 1. 普通地鼠 (Normal Mole) - single click, +2
 * 2. 铁桶地鼠 (Bucket Mole) - double click, +4
 * 3. 闹钟 (Clock) - single click, +3s
 * 4. 宝箱 (Chest) - double click, +6
 * 5. 炸弹 (Bomb) - STRICT BLACKLIST > 0.68 confidence
 * 6. 土坑/洞 (Earthen Hole)
 * 7. 木槌 (Wooden Hammer)
 */

export const HoleBaseSvg: React.FC<{ className?: string }> = ({ className = 'w-full h-full' }) => (
  <svg viewBox="0 0 160 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="80" cy="55" rx="68" ry="34" fill="#5A3A1A" opacity="0.4" />
    <ellipse cx="80" cy="50" rx="64" ry="30" fill="#9C6B30" />
    <ellipse cx="80" cy="48" rx="58" ry="26" fill="#C6934B" />
    <ellipse cx="80" cy="48" rx="52" ry="22" fill="#523116" />
    <ellipse cx="80" cy="50" rx="46" ry="18" fill="#2E180A" />
    {/* Dirt pebbles and texture */}
    <circle cx="36" cy="52" r="3" fill="#ECD29A" />
    <circle cx="122" cy="54" r="4" fill="#ECD29A" />
    <circle cx="50" cy="62" r="2.5" fill="#ECD29A" />
    <circle cx="106" cy="60" r="3" fill="#ECD29A" />
    <circle cx="78" cy="66" r="2" fill="#ECD29A" />
    <circle cx="95" cy="64" r="3.5" fill="#D4B07B" />
    <circle cx="62" cy="40" r="2" fill="#3D1F08" opacity="0.5" />
    <circle cx="98" cy="42" r="2.5" fill="#3D1F08" opacity="0.5" />
  </svg>
);

export const NormalMoleSvg: React.FC<{ className?: string; isHit?: boolean }> = ({ className = 'w-full h-full', isHit = false }) => (
  <svg viewBox="0 0 140 160" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Dirt mound base */}
    <ellipse cx="70" cy="142" rx="58" ry="16" fill="#9C6B30" />
    <ellipse cx="70" cy="140" rx="48" ry="12" fill="#C6934B" />
    <ellipse cx="70" cy="140" rx="40" ry="8" fill="#523116" />
    <circle cx="32" cy="142" r="3" fill="#ECD29A" />
    <circle cx="108" cy="144" r="3.5" fill="#ECD29A" />

    {/* Body */}
    <path d="M30 140 C28 95 38 48 70 48 C102 48 112 95 110 140 Z" fill="#EE8A22" />
    {/* Belly */}
    <path d="M44 140 C44 98 52 75 70 75 C88 75 96 98 96 140 Z" fill="#FDF3E3" />
    
    {/* Ears */}
    <circle cx="38" cy="50" r="14" fill="#EE8A22" />
    <circle cx="38" cy="50" r="8" fill="#FFB0B0" />
    <circle cx="102" cy="50" r="14" fill="#EE8A22" />
    <circle cx="102" cy="50" r="8" fill="#FFB0B0" />

    {/* Tiny head ornament/fruit */}
    <circle cx="70" cy="28" r="9" fill="#F49A24" />
    <path d="M70 20 Q74 14 78 16" stroke="#487822" strokeWidth="2.5" strokeLinecap="round" fill="none" />
    <ellipse cx="76" cy="16" rx="4" ry="2" fill="#69A82B" transform="rotate(-20 76 16)" />

    {/* Cheeks */}
    <ellipse cx="46" cy="98" rx="16" ry="14" fill="#FFFBF5" />
    <ellipse cx="94" cy="98" rx="16" ry="14" fill="#FFFBF5" />
    <ellipse cx="44" cy="100" rx="8" ry="4" fill="#FF9696" opacity="0.6" />
    <ellipse cx="96" cy="100" rx="8" ry="4" fill="#FF9696" opacity="0.6" />

    {/* Forehead blaze */}
    <path d="M64 48 C66 65 65 72 65 78 C68 80 72 80 75 78 C75 72 74 65 76 48 Z" fill="#FFFBF5" />

    {isHit ? (
      <>
        {/* Dizzy X eyes */}
        <path d="M44 68 L58 82 M58 68 L44 82" stroke="#522405" strokeWidth="4" strokeLinecap="round" />
        <path d="M82 68 L96 82 M96 68 L82 82" stroke="#522405" strokeWidth="4" strokeLinecap="round" />
        {/* Crying tears */}
        <ellipse cx="40" cy="94" rx="4" ry="8" fill="#4FB6F8" opacity="0.8" />
        <ellipse cx="100" cy="94" rx="4" ry="8" fill="#4FB6F8" opacity="0.8" />
        {/* Open crying mouth */}
        <ellipse cx="70" cy="104" rx="9" ry="7" fill="#88180A" />
      </>
    ) : (
      <>
        {/* Big sparkling brown eyes */}
        <circle cx="50" cy="74" r="10" fill="#421E06" />
        <circle cx="48" cy="71" r="4" fill="#FFFFFF" />
        <circle cx="53" cy="77" r="1.5" fill="#FFFFFF" />

        <circle cx="90" cy="74" r="10" fill="#421E06" />
        <circle cx="88" cy="71" r="4" fill="#FFFFFF" />
        <circle cx="93" cy="77" r="1.5" fill="#FFFFFF" />

        {/* Nose */}
        <ellipse cx="70" cy="90" rx="5" ry="3.5" fill="#FF7070" />

        {/* Happy smiling mouth with buck teeth */}
        <path d="M62 96 Q70 102 78 96" stroke="#421E06" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        <rect x="66" y="96" width="4" height="6" rx="1" fill="#FFFFFF" stroke="#421E06" strokeWidth="1" />
        <rect x="70" y="96" width="4" height="6" rx="1" fill="#FFFFFF" stroke="#421E06" strokeWidth="1" />
        <path d="M64 102 Q70 112 76 102 Z" fill="#D32F2F" />
      </>
    )}

    {/* Little paws */}
    <ellipse cx="48" cy="132" rx="7" ry="5" fill="#FCEBD2" stroke="#EE8A22" strokeWidth="1.5" />
    <ellipse cx="92" cy="132" rx="7" ry="5" fill="#FCEBD2" stroke="#EE8A22" strokeWidth="1.5" />
  </svg>
);

export const BucketMoleSvg: React.FC<{ className?: string; isHitStage1?: boolean; isHitStage2?: boolean }> = ({
  className = 'w-full h-full',
  isHitStage1 = false,
  isHitStage2 = false,
}) => (
  <svg viewBox="0 0 140 160" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Base Mole */}
    <NormalMoleSvg className="w-full h-full" isHit={isHitStage2} />

    {/* Blue Bucket / Helmet (Only present if not hit stage 1) */}
    {!isHitStage1 && !isHitStage2 && (
      <g id="blue-bucket">
        {/* Bucket shadow */}
        <ellipse cx="70" cy="50" rx="34" ry="8" fill="#154B75" opacity="0.3" />
        {/* Inverted Bucket Body */}
        <path d="M42 48 L48 10 C48 8 50 6 54 6 L86 6 C90 6 92 8 92 10 L98 48 Z" fill="#1C86D9" />
        {/* Bucket rim highlight */}
        <ellipse cx="70" cy="48" rx="28" ry="6" fill="#29A2F4" />
        <ellipse cx="70" cy="48" rx="25" ry="4" fill="#116BAE" />
        {/* Top of bucket (bottom when inverted) */}
        <ellipse cx="70" cy="7" rx="19" ry="4" fill="#38B3FF" />
        {/* Bucket grooves and metal rivets */}
        <line x1="45" y1="26" x2="95" y2="26" stroke="#13639F" strokeWidth="2.5" />
        <line x1="47" y1="36" x2="93" y2="36" stroke="#48BAFF" strokeWidth="1.5" />
        <circle cx="44" cy="46" r="2.5" fill="#FFDE59" stroke="#9E7600" strokeWidth="1" />
        <circle cx="96" cy="46" r="2.5" fill="#FFDE59" stroke="#9E7600" strokeWidth="1" />
        {/* Bucket handle hanging down */}
        <path d="M44 46 Q70 62 96 46" stroke="#99D5FF" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      </g>
    )}

    {/* Broken bucket fragments when cracked */}
    {isHitStage1 && !isHitStage2 && (
      <g opacity="0.9">
        <path d="M30 18 L46 8 L42 28 Z" fill="#1C86D9" />
        <path d="M94 12 L110 24 L98 32 Z" fill="#29A2F4" />
        {/* Dizzy stars */}
        <path d="M68 20 L70 26 L76 28 L70 30 L68 36 L66 30 L60 28 L66 26 Z" fill="#FFD700" />
      </g>
    )}
  </svg>
);

export const ClockSvg: React.FC<{ className?: string; isHit?: boolean }> = ({ className = 'w-full h-full', isHit = false }) => (
  <svg viewBox="0 0 140 160" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Dirt mound base */}
    <ellipse cx="70" cy="142" rx="58" ry="16" fill="#9C6B30" />
    <ellipse cx="70" cy="140" rx="48" ry="12" fill="#C6934B" />
    <ellipse cx="70" cy="140" rx="40" ry="8" fill="#523116" />
    <circle cx="34" cy="144" r="3" fill="#ECD29A" />
    <circle cx="106" cy="143" r="3.5" fill="#ECD29A" />

    {/* Clock Feet */}
    <path d="M42 124 L34 136 M98 124 L106 136" stroke="#D39E18" strokeWidth="6" strokeLinecap="round" />

    {/* Alarm Bells */}
    <ellipse cx="38" cy="44" rx="14" ry="11" fill="#FFD233" transform="rotate(-30 38 44)" />
    <ellipse cx="38" cy="44" rx="10" ry="7" fill="#FFE27A" transform="rotate(-30 38 44)" />
    <path d="M45 52 L54 62" stroke="#B88507" strokeWidth="4" strokeLinecap="round" />

    <ellipse cx="102" cy="44" rx="14" ry="11" fill="#FFD233" transform="rotate(30 102 44)" />
    <ellipse cx="102" cy="44" rx="10" ry="7" fill="#FFE27A" transform="rotate(30 102 44)" />
    <path d="M95 52 L86 62" stroke="#B88507" strokeWidth="4" strokeLinecap="round" />

    {/* Top alarm hammer */}
    <rect x="68" y="26" width="4" height="12" rx="2" fill="#B88507" />
    <circle cx="70" cy="24" r="5" fill="#FFD233" />

    {/* Clock outer gold body */}
    <circle cx="70" cy="85" r="48" fill="#E8A714" />
    <circle cx="70" cy="85" r="45" fill="#FFD53D" />
    <circle cx="70" cy="85" r="41" fill="#FCE881" />

    {/* Dial face */}
    <circle cx="70" cy="85" r="36" fill="#FFFFFF" />
    <circle cx="70" cy="85" r="34" fill="#F6F9FF" />

    {/* Clock markings (12, 1, 2, 3...) */}
    <circle cx="70" cy="55" r="2" fill="#5D4B8B" />
    <circle cx="85" cy="59" r="1.5" fill="#5D4B8B" />
    <circle cx="96" cy="70" r="1.5" fill="#5D4B8B" />
    <circle cx="100" cy="85" r="2" fill="#5D4B8B" />
    <circle cx="96" cy="100" r="1.5" fill="#5D4B8B" />
    <circle cx="85" cy="111" r="1.5" fill="#5D4B8B" />
    <circle cx="70" cy="115" r="2" fill="#5D4B8B" />
    <circle cx="55" cy="111" r="1.5" fill="#5D4B8B" />
    <circle cx="44" cy="100" r="1.5" fill="#5D4B8B" />
    <circle cx="40" cy="85" r="2" fill="#5D4B8B" />
    <circle cx="44" cy="70" r="1.5" fill="#5D4B8B" />
    <circle cx="55" cy="59" r="1.5" fill="#5D4B8B" />

    {/* Center pin & purple hands (matching video at 10:02) */}
    <circle cx="70" cy="85" r="4" fill="#5A3598" />
    {/* Hour hand */}
    <line x1="70" y1="85" x2="52" y2="72" stroke="#5A3598" strokeWidth="4" strokeLinecap="round" />
    {/* Minute hand */}
    <line x1="70" y1="85" x2="72" y2="56" stroke="#683DB5" strokeWidth="3" strokeLinecap="round" />

    {/* +3s badge when hit */}
    {isHit && (
      <g>
        <circle cx="70" cy="85" r="30" fill="#FFE27A" opacity="0.6" />
        <text x="70" y="92" textAnchor="middle" fill="#E65100" fontSize="20" fontWeight="bold" fontFamily="sans-serif">+3s</text>
      </g>
    )}
  </svg>
);

export const ChestSvg: React.FC<{ className?: string; isHitStage1?: boolean; isHitStage2?: boolean }> = ({
  className = 'w-full h-full',
  isHitStage1 = false,
  isHitStage2 = false,
}) => (
  <svg viewBox="0 0 140 160" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Dirt mound base */}
    <ellipse cx="70" cy="142" rx="58" ry="16" fill="#9C6B30" />
    <ellipse cx="70" cy="140" rx="48" ry="12" fill="#C6934B" />
    <ellipse cx="70" cy="140" rx="40" ry="8" fill="#523116" />
    <circle cx="35" cy="143" r="3" fill="#ECD29A" />
    <circle cx="105" cy="144" r="3.5" fill="#ECD29A" />

    {/* Gift Box Base */}
    {/* Red Box Body */}
    <path d="M25 72 L115 72 L108 134 L32 134 Z" fill="#D32F2F" />
    {/* Shadow stripes */}
    <path d="M25 72 L115 72 L108 85 L32 85 Z" fill="#B71C1C" opacity="0.3" />
    <path d="M28 100 L112 100 L110 112 L30 112 Z" fill="#E53935" opacity="0.5" />

    {/* Big yellow question mark on front */}
    <text x="50" y="112" fill="#FFEB3B" fontSize="32" fontWeight="900" fontFamily="sans-serif" filter="drop-shadow(0 2px 2px rgba(0,0,0,0.3))">?</text>
    <text x="82" y="112" fill="#FFD54F" fontSize="28" fontWeight="900" fontFamily="sans-serif" opacity="0.8">?</text>

    {/* Vertical Ribbon */}
    <rect x="64" y="72" width="12" height="62" fill="#FFD600" />
    <rect x="66" y="72" width="4" height="62" fill="#FFF59D" />

    {/* Lid */}
    <path d="M18 54 L122 54 C124 54 125 56 125 58 L122 74 C122 76 120 77 118 77 L22 77 C20 77 18 76 18 74 L15 58 C15 56 16 54 18 54 Z" fill="#E53935" />
    <path d="M15 54 L125 54 L123 60 L17 60 Z" fill="#EF5350" />
    {/* Ribbon on Lid */}
    <rect x="63" y="54" width="14" height="23" fill="#FFD600" />

    {/* Golden Bow on top */}
    <ellipse cx="54" cy="42" rx="16" ry="12" fill="#FFD600" transform="rotate(-25 54 42)" />
    <ellipse cx="54" cy="42" rx="10" ry="7" fill="#FFC400" transform="rotate(-25 54 42)" />
    <ellipse cx="86" cy="42" rx="16" ry="12" fill="#FFD600" transform="rotate(25 86 42)" />
    <ellipse cx="86" cy="42" rx="10" ry="7" fill="#FFC400" transform="rotate(25 86 42)" />
    {/* Center knot */}
    <circle cx="70" cy="46" r="9" fill="#FFAB00" />
    <circle cx="70" cy="46" r="6" fill="#FFD600" />

    {/* Padlock status or gold burst */}
    {!isHitStage1 && !isHitStage2 && (
      <g filter="drop-shadow(0 2px 4px rgba(0,0,0,0.4))">
        {/* Golden Padlock on ribbon */}
        <rect x="63" y="86" width="14" height="12" rx="2" fill="#FFC107" stroke="#FFA000" strokeWidth="1.5" />
        <path d="M66 86 V80 C66 77 74 77 74 80 V86" stroke="#FFA000" strokeWidth="2.5" fill="none" />
        <circle cx="70" cy="91" r="1.5" fill="#5D4037" />
      </g>
    )}

    {isHitStage1 && !isHitStage2 && (
      <g>
        {/* Padlock broken */}
        <path d="M62 80 L78 94 M78 80 L62 94" stroke="#FFD600" strokeWidth="3" />
        <text x="70" y="85" textAnchor="middle" fill="#FFEB3B" fontSize="12" fontWeight="bold">破锁!</text>
      </g>
    )}

    {isHitStage2 && (
      <g>
        {/* Coin blast */}
        <circle cx="45" cy="50" r="10" fill="#FFD700" stroke="#FFA000" strokeWidth="1.5" />
        <circle cx="95" cy="48" r="12" fill="#FFD700" stroke="#FFA000" strokeWidth="1.5" />
        <circle cx="70" cy="35" r="11" fill="#FFD700" stroke="#FFA000" strokeWidth="1.5" />
        <text x="70" y="70" textAnchor="middle" fill="#FFF" fontSize="18" fontWeight="bold">+6</text>
      </g>
    )}
  </svg>
);

export const BombSvg: React.FC<{ className?: string; isExploded?: boolean }> = ({ className = 'w-full h-full', isExploded = false }) => (
  <svg viewBox="0 0 140 160" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Dirt mound base */}
    <ellipse cx="70" cy="142" rx="58" ry="16" fill="#9C6B30" />
    <ellipse cx="70" cy="140" rx="48" ry="12" fill="#C6934B" />
    <ellipse cx="70" cy="140" rx="40" ry="8" fill="#523116" />
    <circle cx="34" cy="143" r="3" fill="#ECD29A" />
    <circle cx="106" cy="144" r="3.5" fill="#ECD29A" />

    {/* Bomb sphere shadow */}
    <ellipse cx="70" cy="132" rx="36" ry="10" fill="#1C2833" opacity="0.4" />

    {/* Twisted Fuse Rope */}
    <path d="M74 46 C74 30 92 36 96 22 C98 16 95 12 104 10" stroke="#D7B576" strokeWidth="7" strokeLinecap="round" fill="none" />
    <path d="M74 46 C74 30 92 36 96 22 C98 16 95 12 104 10" stroke="#936F38" strokeWidth="3" strokeDasharray="3 3" strokeLinecap="round" fill="none" />

    {/* Spark / Lit Wick */}
    <circle cx="106" cy="8" r="7" fill="#FF5722" />
    <circle cx="106" cy="8" r="4" fill="#FFEB3B" />
    <line x1="106" y1="8" x2="114" y2="4" stroke="#FFF" strokeWidth="2" strokeLinecap="round" />
    <line x1="106" y1="8" x2="112" y2="15" stroke="#FF9800" strokeWidth="2" strokeLinecap="round" />
    <line x1="106" y1="8" x2="100" y2="2" stroke="#FF9800" strokeWidth="2" strokeLinecap="round" />

    {/* Bomb metallic sphere neck */}
    <rect x="62" y="44" width="18" height="8" rx="2" fill="#4B6584" />
    <rect x="64" y="43" width="14" height="3" fill="#778CA3" />

    {/* Bomb sphere body - blue-gray iron cartoon cannonball */}
    <circle cx="71" cy="90" r="44" fill="#4B6584" />
    <circle cx="71" cy="90" r="41" fill="#577A9C" />
    <path d="M40 64 C50 56 64 54 78 54 C60 62 48 76 40 92 Z" fill="#7FA4C7" opacity="0.6" />

    {/* Yellow skull emblem on bomb */}
    <g transform="translate(48, 70)">
      {/* Skull head */}
      <ellipse cx="18" cy="18" rx="14" ry="12" fill="#FFD53D" />
      {/* Skull jaw */}
      <rect x="11" y="24" width="14" height="9" rx="2" fill="#FFD53D" />
      {/* Eye sockets */}
      <circle cx="13" cy="16" r="3.5" fill="#3D5066" />
      <circle cx="23" cy="16" r="3.5" fill="#3D5066" />
      {/* Nose */}
      <polygon points="18,21 16,25 20,25" fill="#3D5066" />
      {/* Teeth */}
      <line x1="14" y1="30" x2="14" y2="33" stroke="#3D5066" strokeWidth="1.5" />
      <line x1="18" y1="30" x2="18" y2="33" stroke="#3D5066" strokeWidth="1.5" />
      <line x1="22" y1="30" x2="22" y2="33" stroke="#3D5066" strokeWidth="1.5" />
    </g>

    {/* Blacklist banner indicator */}
    <g transform="translate(15, 120)">
      <rect width="110" height="20" rx="10" fill="#B71C1C" />
      <text x="55" y="14" textAnchor="middle" fill="#FFFFFF" fontSize="11" fontWeight="bold" fontFamily="sans-serif">
        ⚠️ 禁点黑名单
      </text>
    </g>
  </svg>
);

export const HammerSvg: React.FC<{ className?: string; isSwinging?: boolean }> = ({ className = 'w-full h-full', isSwinging = false }) => (
  <svg
    viewBox="0 0 120 120"
    className={`${className} transition-transform duration-75 origin-bottom-right ${isSwinging ? '-rotate-45 translate-y-3' : 'rotate-12'}`}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Wooden handle */}
    <rect x="52" y="35" width="12" height="75" rx="5" fill="#D7A15C" stroke="#8D5B28" strokeWidth="2" transform="rotate(35 52 35)" />
    <line x1="68" y1="52" x2="100" y2="105" stroke="#C28945" strokeWidth="4" strokeLinecap="round" />
    {/* Handle grip */}
    <rect x="88" y="85" width="14" height="28" rx="4" fill="#B33927" stroke="#68190D" strokeWidth="1.5" transform="rotate(35 88 85)" />

    {/* Hammer head (cartoon mallet) */}
    {/* Head body */}
    <path d="M22 28 C22 24 35 15 48 18 L72 32 C78 36 82 48 76 58 L62 82 C56 92 42 90 36 86 L18 72 C12 66 12 55 18 45 Z" fill="#DE5844" />
    <path d="M24 32 C30 24 45 20 65 32 C58 48 42 75 28 72 C22 62 20 45 24 32 Z" fill="#F07968" opacity="0.7" />

    {/* Striking faces */}
    <ellipse cx="22" cy="35" rx="14" ry="10" fill="#FCE2B6" stroke="#996328" strokeWidth="2" transform="rotate(-30 22 35)" />
    <ellipse cx="70" cy="65" rx="14" ry="10" fill="#C28945" stroke="#663A0F" strokeWidth="2" transform="rotate(30 70 65)" />

    {/* Gold stars / strike impact if swinging */}
    {isSwinging && (
      <g>
        <circle cx="15" cy="45" r="5" fill="#FFEB3B" />
        <path d="M5 25 L12 32 L4 38 L14 40 L16 50 L22 42 L30 46 L26 36 L34 30 L24 28 Z" fill="#FFD700" />
      </g>
    )}
  </svg>
);
