import React from 'react';
import Symbol from '@/components/ui/Symbol/Symbol';

interface CustomNavIconProps {
  name: string;
  size?: number;
  fill?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export default function CustomNavIcon({ name, size = 24, fill = false, style, className = '', ...props }: CustomNavIconProps) {
  const activeColor = "var(--sf-primary)";
  const strokeColor = fill ? activeColor : "currentColor";
  const strokeWidth = fill ? 2.5 : 2;

  // Custom paths for each icon
  let content = null;

  switch (name) {
    case 'home':
      content = (
        <>
          <path d="M4 10L12 3L20 10V20C20 20.5523 19.5523 21 19 21H5C4.44772 21 4 20.5523 4 20V10Z" stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" fill={fill ? activeColor : "none"} />
          <path d="M9 21V12H15V21" stroke={fill ? "#fff" : strokeColor} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" fill={fill ? "#fff" : "none"} />
        </>
      );
      break;
    case 'precision_manufacturing':
      content = (
        <>
          <path d="M4 19H20" stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
          <path d="M6 19V9C6 6 8 5 11 5H17C18.5 5 19 6.5 19 8V14H15" stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" fill={fill ? "var(--sf-primary-alpha-20)" : "none"} />
          <path d="M15 14V19" stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
          <path d="M15 17H13" stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="10" cy="11" r="2" stroke={strokeColor} strokeWidth={fill ? 1.5 : 2} fill={fill ? activeColor : "none"} />
        </>
      );
      break;
    case 'group':
      content = (
        <>
          <circle cx="9" cy="7" r="4" stroke={strokeColor} strokeWidth={strokeWidth} fill={fill ? activeColor : "none"} />
          <path d="M2 21V19C2 15.6863 4.68629 13 8 13H10C13.3137 13 16 15.6863 16 19V21" stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round" fill={fill ? activeColor : "none"} />
          <circle cx="16.5" cy="9.5" r="3.5" stroke={strokeColor} strokeWidth={strokeWidth} fill={fill ? activeColor : "none"} />
          <path d="M22 21V19C22 16.5147 20.4853 14.5 18 14.5" stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round" />
        </>
      );
      break;
    case 'texture':
      content = (
        <>
          <ellipse cx="7" cy="12" rx="3" ry="8" stroke={strokeColor} strokeWidth={strokeWidth} fill={fill ? activeColor : "none"} />
          <path d="M7 4H17C18.6569 4 20 5.34315 20 7V17C20 18.6569 18.6569 20 17 20H7" stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round" fill={fill ? "var(--sf-primary-alpha-20)" : "none"} />
          <path d="M13 4V20" stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round" />
          <path d="M17 4V20" stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round" />
        </>
      );
      break;
    case 'storefront':
      content = (
        <>
          <path d="M3 9L4 4H20L21 9V11C21 11.5523 20.5523 12 20 12V20H4V12C3.44772 12 3 11.5523 3 11V9Z" stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" fill={fill ? activeColor : "none"} />
          <path d="M9 12V20" stroke={fill ? "#fff" : strokeColor} strokeWidth={strokeWidth} />
          <path d="M15 12V20" stroke={fill ? "#fff" : strokeColor} strokeWidth={strokeWidth} />
          <path d="M3 9H21" stroke={strokeColor} strokeWidth={strokeWidth} />
        </>
      );
      break;
    case 'calendar_month':
      content = (
        <>
          <rect x="3" y="4" width="18" height="18" rx="2" stroke={strokeColor} strokeWidth={strokeWidth} fill={fill ? activeColor : "none"} />
          <path d="M16 2V6" stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round" />
          <path d="M8 2V6" stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round" />
          <path d="M3 10H21" stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round" />
        </>
      );
      break;
    case 'collections_bookmark':
      content = (
        <>
          <path d="M5 4H17C18.1046 4 19 4.89543 19 6V20H6C4.89543 20 4 19.1046 4 18V5C4 4.44772 4.44772 4 5 4Z" stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" fill={fill ? activeColor : "none"} />
          <path d="M19 6C19 4.89543 19.8954 4 21 4V18C21 19.1046 20.1046 20 19 20" stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round" />
          <path d="M12 4V12L9.5 10.5L7 12V4" stroke={fill ? "#fff" : strokeColor} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" fill={fill ? "#fff" : "none"} />
        </>
      );
      break;
    case 'account_balance_wallet':
      content = (
        <>
          <rect x="3" y="5" width="18" height="14" rx="2" stroke={strokeColor} strokeWidth={strokeWidth} fill={fill ? activeColor : "none"} />
          <path d="M16 9H21V15H16C15.4477 15 15 14.5523 15 14V10C15 9.44772 15.4477 9 16 9Z" stroke={fill ? "#fff" : strokeColor} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" fill={fill ? "#fff" : "none"} />
        </>
      );
      break;
    case 'point_of_sale':
      content = (
        <>
          <path d="M7 3H17L21 9L12 21L3 9L7 3Z" stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" fill={fill ? activeColor : "none"} />
          <circle cx="12" cy="9" r="2" stroke={fill ? "#fff" : strokeColor} strokeWidth={strokeWidth} fill={fill ? "#fff" : "none"} />
        </>
      );
      break;
    case 'settings':
      content = (
        <>
          <circle cx="12" cy="12" r="3" stroke={strokeColor} strokeWidth={strokeWidth} fill={fill ? "var(--sf-primary-alpha-20)" : "none"} />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" fill={fill ? activeColor : "none"} />
        </>
      );
      break;
    default:
      // Fallback to original Material Symbol!
      return <Symbol name={name} fill={fill} size={size} className={className} style={style} />;
  }

  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{
        ...style,
        transition: 'all 0.2s ease',
      }}
      {...props}
    >
      {content}
    </svg>
  );
}
