import React, { useEffect, useRef } from 'react';

const DEFAULT_SCRIPT_ID = 'moralis-chart-widget';
const DEFAULT_CONTAINER_ID = 'price-chart-widget-container';

export const PriceChartWidget = ({
  tokenAddress,
  chainId = 'solana',
  theme = 'dark',
  locale = 'en',
  defaultInterval = '5',
  width = '100%',
  height = '500px',
}) => {
  const containerRef = useRef(null);

  useEffect(() => {
    const loadWidget = () => {
      if (typeof window.createMyWidget === 'function') {
        window.createMyWidget(DEFAULT_CONTAINER_ID, {
          autoSize: true,
          chainId,
          tokenAddress,
          defaultInterval,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'Etc/UTC',
          theme,
          locale,
          backgroundColor: '#09090b',
          gridColor: '#0d2035',
          textColor: '#68738D',
          candleUpColor: '#7ed321',
          candleDownColor: '#E64C4C',
          hideLeftToolbar: true,
          hideTopToolbar: true,
          hideBottomToolbar: true,
        });
      } else {
        console.error('createMyWidget non è definita');
      }
    };

    if (!document.getElementById(DEFAULT_SCRIPT_ID)) {
      const script = document.createElement('script');
      script.id = DEFAULT_SCRIPT_ID;
      script.src = 'https://moralis.com/static/embed/chart.js';
      script.type = 'text/javascript';
      script.async = true;
      script.onload = loadWidget;
      script.onerror = () => {
        console.error('Errore nel caricamento dello script.');
      };
      document.body.appendChild(script);
    } else {
      loadWidget();
    }
  }, [tokenAddress, chainId, theme, locale, defaultInterval]);

  return (
    <div style={{ width, height }}>
      <div
        id={DEFAULT_CONTAINER_ID}
        ref={containerRef}
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
};
