import { useTheme } from '../context/ThemeContext';

/**
 * eNuzul brand logo
 * - light theme → green mark (logo-light.png)
 * - dark theme → white mark (logo-dark.png)
 * - force="light"|"dark"|"brand" to override
 */
export default function BrandLogo({
  className = '',
  height = 40,
  force,
  priority = false,
}) {
  const { theme } = useTheme();
  const mode = force || theme || 'light';

  const src =
    mode === 'brand'
      ? '/enuzullogo3.jpeg'
      : mode === 'dark'
        ? '/logo-dark.png'
        : '/logo-light.png';

  return (
    <img
      src={src}
      alt="eNuzul"
      height={height}
      className={`object-contain select-none ${className}`}
      style={{ height, width: 'auto', maxWidth: '100%' }}
      draggable={false}
      {...(priority ? { fetchPriority: 'high' } : {})}
    />
  );
}
