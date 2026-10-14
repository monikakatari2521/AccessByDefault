import React, { useState } from 'react';
import { Globe, ArrowRight, Loader2, Sparkles, AlertCircle } from 'lucide-react';

interface ScanFormProps {
  onSubmit: (url: string) => void;
  isLoading: boolean;
}

export const ScanForm: React.FC<ScanFormProps> = ({ onSubmit, isLoading }) => {
  const [url, setUrl] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const trimmed = url.trim();
    if (!trimmed) {
      setValidationError('Please enter a website URL to audit.');
      return;
    }

    let formattedUrl = trimmed;
    if (!/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = 'https://' + formattedUrl;
    }

    try {
      const parsed = new URL(formattedUrl);
      if (!parsed.hostname || !parsed.hostname.includes('.')) {
        setValidationError('Please enter a valid hostname (e.g. example.com or https://site.org).');
        return;
      }
      onSubmit(parsed.toString());
    } catch {
      setValidationError('Please enter a valid URL format.');
    }
  };

  const handlePreset = (presetUrl: string) => {
    setUrl(presetUrl);
    setValidationError(null);
    onSubmit(presetUrl);
  };

  return (
    <section className="w-full max-w-4xl mx-auto py-8 px-4" aria-labelledby="audit-heading">
      <div className="text-center mb-8">
        <h1 id="audit-heading" className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-3">
          Automated Accessibility Testing
        </h1>
        <p className="text-base text-slate-400 max-w-2xl mx-auto">
          Evaluate public webpages against WCAG 2.0, 2.1, and 2.2 Level AA/AAA standards using Playwright Chromium and axe-core.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="relative mb-4">
        <div className="flex flex-col sm:flex-row items-stretch gap-2 bg-[#131B2E] p-2 rounded-xl border border-[#1E293B] shadow-lg focus-within:border-sky-400 transition-colors">
          <label htmlFor="target-url" className="sr-only">
            Target Website URL
          </label>
          <div className="relative flex-1 flex items-center">
            <Globe className="w-5 h-5 text-slate-500 absolute left-3.5 pointer-events-none" aria-hidden="true" />
            <input
              id="target-url"
              type="text"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                if (validationError) setValidationError(null);
              }}
              placeholder="Enter target URL (e.g., https://example.com)"
              disabled={isLoading}
              className="w-full pl-11 pr-4 py-3 bg-transparent text-white placeholder-slate-500 text-base focus:outline-none disabled:opacity-50"
              aria-describedby="url-helper"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-sky-600 hover:bg-sky-500 text-white font-semibold text-sm rounded-lg transition-colors cursor-pointer shrink-0 disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                <span>Auditing...</span>
              </>
            ) : (
              <>
                <span>Run Audit</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </>
            )}
          </button>
        </div>

        {validationError && (
          <div className="flex items-center gap-2 mt-2.5 text-sm text-red-400 font-medium" role="alert">
            <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{validationError}</span>
          </div>
        )}

        <div id="url-helper" className="sr-only">
          Submits the URL to a headless Chromium browser running axe-core accessibility checks.
        </div>
      </form>

      {/* Preset Quick Checks */}
      <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-slate-400">
        <span className="font-medium text-slate-500">Quick tests:</span>
        <button
          type="button"
          onClick={() => handlePreset('https://example.com')}
          disabled={isLoading}
          className="hover:text-sky-400 underline decoration-slate-700 underline-offset-4 cursor-pointer transition-colors"
        >
          example.com
        </button>
        <span aria-hidden="true" className="text-slate-700">·</span>
        <button
          type="button"
          onClick={() => handlePreset('https://www.w3.org/WAI/')}
          disabled={isLoading}
          className="hover:text-sky-400 underline decoration-slate-700 underline-offset-4 cursor-pointer transition-colors"
        >
          w3.org/WAI
        </button>
        <span aria-hidden="true" className="text-slate-700">·</span>
        <button
          type="button"
          onClick={() => handlePreset('https://en.wikipedia.org/wiki/Web_accessibility')}
          disabled={isLoading}
          className="hover:text-sky-400 underline decoration-slate-700 underline-offset-4 cursor-pointer transition-colors"
        >
          Wikipedia: Web Accessibility
        </button>
      </div>
    </section>
  );
};
