const paths={
 'arrow-right':'M5 12h14m-6-6 6 6-6 6',
 'arrow-left':'M19 12H5m6-6-6 6 6 6',
 'arrow-up':'M12 19V5m-6 6 6-6 6 6',
 'arrow-down':'M12 5v14m-6-6 6 6 6-6',
 external:'M14 5h5v5M19 5l-9 9M10 5H5v14h14v-5',
 close:'m6 6 12 12M18 6 6 18',
 search:'M21 21l-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
 home:'m3 10 9-7 9 7M5 9v12h14V9M9 21v-8h6v8',
 box:'m3 7 9-4 9 4v10l-9 4-9-4V7m0 0 9 4 9-4M12 11v10M7 5l10 5',
 store:'M3 10h18l-2-7H5l-2 7Zm2 0v11h14V10M9 21v-7h6v7',
 inbox:'M4 4h16v16H4V4Zm0 9h5l1 3h4l1-3h5',
 grid:'M4 4h6v6H4V4Zm10 0h6v6h-6V4ZM4 14h6v6H4v-6Zm10 0h6v6h-6v-6Z',
 logout:'M9 4H4v16h5M9 12h12m-5-5 5 5-5 5',
 download:'M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5'
};
export function icon(name){const d=paths[name]||paths['arrow-right'];return `<svg class="ui-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="${d}"/></svg>`;}
