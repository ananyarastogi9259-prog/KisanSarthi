import { useEffect, useId, useRef, type ReactNode } from "react";
import {
  Accessibility,
  AlignLeft,
  BookOpen,
  Check,
  Heading,
  Monitor,
  Moon,
  MousePointerClick,
  RotateCcw,
  Sparkles,
  Sun,
  Type,
  X,
} from "lucide-react";
import {
  BODY_FONT_SIZE_DEFAULT,
  BODY_FONT_SIZE_MAX,
  BODY_FONT_SIZE_MIN,
  HEADING_SCALE_MAX,
  HEADING_SCALE_MIN,
  INTERFACE_SCALE_MAX,
  INTERFACE_SCALE_MIN,
  useAccessibility,
} from "@/lib/accessibility";
import { useLanguage } from "@/lib/i18n";

function TextSpaceLogo() {
  return (
    <svg viewBox="0 0 44 44" fill="none" className="h-11 w-11" aria-hidden="true">
      <path
        d="M6 22 10.5 9 15 22M7.5 18.5h6M29 22l4.5-13L38 22M30.5 18.5h6"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8 33h28M12.5 28.5 8 33l4.5 4.5M31.5 28.5 36 33l-4.5 4.5"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function HighlightLinksLogo() {
  return (
    <svg viewBox="0 0 44 44" fill="none" className="h-11 w-11" aria-hidden="true">
      <path
        d="M18 24a6 6 0 0 0 8.5 0l5.5-5.5a6 6 0 0 0-8.5-8.5l-2 2"
        stroke="currentColor"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M26 16a6 6 0 0 0-8.5 0L12 21.5a6 6 0 0 0 8.5 8.5l2-2"
        stroke="currentColor"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M8 37h28" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" />
    </svg>
  );
}

function ReadingRulerLogo() {
  return (
    <svg viewBox="0 0 44 44" fill="none" className="h-11 w-11" aria-hidden="true">
      <path
        d="M9 11h26M9 33h26"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        opacity="0.45"
      />
      <rect
        x="5"
        y="17"
        width="34"
        height="10"
        rx="3"
        stroke="currentColor"
        strokeWidth="2.6"
        fill="currentColor"
        fillOpacity="0.14"
      />
      <path d="M10 22h24" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  );
}

function SquareTileButton({
  label,
  title,
  icon,
  active,
  role,
  checked,
  onClick,
}: {
  label: string;
  title: string;
  icon: ReactNode;
  active: boolean;
  role?: "radio";
  checked?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role={role}
      aria-label={label}
      title={`${label} — ${title}`}
      aria-pressed={role ? undefined : active}
      aria-checked={role ? checked : undefined}
      onClick={onClick}
      className={`relative flex aspect-square flex-col items-center justify-center gap-2 rounded-2xl border p-2.5 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        active
          ? "border-primary bg-primary text-primary-foreground shadow-sm"
          : "bg-surface text-foreground hover:border-primary/40 hover:bg-secondary"
      }`}
    >
      <span className="grid shrink-0 place-items-center" aria-hidden="true">
        {icon}
      </span>
      <span className="text-xs font-semibold leading-snug">{label}</span>
      {active && (
        <span
          aria-hidden="true"
          className="absolute right-2 top-2 grid h-5 w-5 place-items-center rounded-md bg-primary-foreground/20"
        >
          <Check className="h-3.5 w-3.5" />
        </span>
      )}
    </button>
  );
}

function LabeledSlider({
  id,
  label,
  title,
  icon,
  valueLabel,
  min,
  max,
  step,
  value,
  onChange,
  readoutTestId,
}: {
  id: string;
  label: string;
  title: string;
  icon: ReactNode;
  valueLabel: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
  readoutTestId?: string;
}) {
  return (
    <div title={title} className="space-y-1.5 rounded-xl border bg-surface px-3 py-2.5">
      <div className="flex items-center justify-between gap-2">
        <label
          htmlFor={id}
          className="flex items-center gap-2 text-xs font-semibold text-foreground"
        >
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-background text-primary">
            {icon}
          </span>
          <span>{label}</span>
        </label>
        <span
          data-testid={readoutTestId}
          className="font-mono text-xs font-semibold text-primary tabular-nums"
        >
          {valueLabel}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={label}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1.5 w-full cursor-pointer accent-primary"
      />
    </div>
  );
}

export function AccessibilityControl() {
  const { panelOpen, setPanelOpen, activeFeatureCount } = useAccessibility();
  const { t } = useLanguage();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const a = t.accessibility;

  return (
    <>
      {!panelOpen && (
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setPanelOpen(true)}
          aria-expanded={panelOpen}
          aria-haspopup="dialog"
          aria-controls={panelId}
          aria-label={a.triggerAriaLabel}
          title={a.triggerAriaLabel}
          data-a11y-panel-ui="true"
          data-testid="accessibility-floating-button"
          className="fixed bottom-4 left-4 z-40 flex h-16 w-16 flex-col items-center justify-center gap-0.5 rounded-xl border border-primary/30 bg-primary p-1.5 text-primary-foreground shadow-card transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none sm:bottom-6 sm:left-6 sm:h-[72px] sm:w-[72px]"
        >
          <Accessibility
            className="h-7 w-7 shrink-0 sm:h-8 sm:w-8"
            strokeWidth={2.2}
            aria-hidden="true"
          />
          <span className="max-w-full truncate text-center text-[10px] font-bold leading-tight">
            {a.triggerLabel}
          </span>
          {activeFeatureCount > 0 && (
            <span
              data-testid="a11y-active-badge"
              className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-md border border-background bg-gold px-1 font-mono text-[11px] font-bold text-gold-foreground tabular-nums"
            >
              {activeFeatureCount}
            </span>
          )}
        </button>
      )}

      {panelOpen && (
        <AccessibilityPanel
          panelId={panelId}
          onClose={() => {
            setPanelOpen(false);
            window.requestAnimationFrame(() => triggerRef.current?.focus());
          }}
        />
      )}
    </>
  );
}

export function AccessibilityPanel({ panelId, onClose }: { panelId: string; onClose: () => void }) {
  const {
    settings,
    updateSettings,
    toggleDyslexiaMode,
    toggleTextSpacing,
    resetSettings,
    increaseTextSize,
    decreaseTextSize,
    resetTextSize,
  } = useAccessibility();
  const { lang, t } = useLanguage();
  const a = t.accessibility;

  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  useEffect(() => {
    closeButtonRef.current?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const isDark = settings.colorMode === "dark";
  const smallerName = lang === "hi" ? "छोटा टेक्स्ट" : "Smaller";
  const largerName = lang === "hi" ? "बड़ा टेक्स्ट" : "Larger";

  return (
    <div
      data-a11y-panel-ui="true"
      data-a11y-panel-shell="true"
      className="fixed inset-0 z-50 flex justify-start bg-black/40 backdrop-blur-[2px]"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        id={panelId}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex h-full w-full max-w-lg flex-col border-r bg-background text-foreground shadow-2xl"
      >
        <header className="flex items-center justify-between gap-3 border-b px-5 py-3.5">
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
              <Accessibility className="h-8 w-8" strokeWidth={2.2} aria-hidden="true" />
            </span>
            <h2 id={titleId} className="text-lg font-bold text-foreground">
              {a.triggerLabel}
            </h2>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label={a.closePanel}
            title={a.closePanel}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border bg-surface text-foreground transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
          <div className="grid grid-cols-3 gap-3">
            <SquareTileButton
              label={a.dyslexia.dyslexiaModeLabel}
              title={a.dyslexia.dyslexiaModeDesc}
              icon={<BookOpen className="h-11 w-11" strokeWidth={2} />}
              active={settings.dyslexiaMode}
              onClick={toggleDyslexiaMode}
            />
            <SquareTileButton
              label={a.dyslexia.textSpaceLabel}
              title={a.dyslexia.textSpaceDesc}
              icon={<TextSpaceLogo />}
              active={settings.textSpacing}
              onClick={toggleTextSpacing}
            />
            <SquareTileButton
              label={a.assist.highlightLinksLabel}
              title={a.assist.highlightLinksDesc}
              icon={<HighlightLinksLogo />}
              active={settings.highlightLinks}
              onClick={() => updateSettings({ highlightLinks: !settings.highlightLinks })}
            />
            <SquareTileButton
              label={a.dyslexia.leftAlignLabel}
              title={a.dyslexia.leftAlignDesc}
              icon={<AlignLeft className="h-11 w-11" strokeWidth={2} />}
              active={settings.leftAlign}
              onClick={() => updateSettings({ leftAlign: !settings.leftAlign })}
            />
            <SquareTileButton
              label={a.dyslexia.reducedClutterLabel}
              title={a.dyslexia.reducedClutterDesc}
              icon={<Sparkles className="h-11 w-11" strokeWidth={2} />}
              active={settings.reducedClutter}
              onClick={() => updateSettings({ reducedClutter: !settings.reducedClutter })}
            />
            <SquareTileButton
              label={a.dyslexia.readingRulerLabel}
              title={a.dyslexia.readingRulerDesc}
              icon={<ReadingRulerLogo />}
              active={settings.readingRuler}
              onClick={() => updateSettings({ readingRuler: !settings.readingRuler })}
            />
            <SquareTileButton
              label={a.textSize.enlargeControlsLabel}
              title={a.textSize.enlargeControlsDesc}
              icon={<MousePointerClick className="h-11 w-11" strokeWidth={2} />}
              active={settings.enlargeControls}
              onClick={() => updateSettings({ enlargeControls: !settings.enlargeControls })}
            />
            <SquareTileButton
              label={a.color.modes.light}
              title={a.color.modes.light}
              icon={<Sun className="h-11 w-11" strokeWidth={2} />}
              active={!isDark}
              role="radio"
              checked={!isDark}
              onClick={() =>
                updateSettings({
                  colorMode: "default",
                  customColorsEnabled: false,
                  invertColors: false,
                })
              }
            />
            <SquareTileButton
              label={a.color.modes.dark}
              title={a.color.modes.dark}
              icon={<Moon className="h-11 w-11" strokeWidth={2} />}
              active={isDark}
              role="radio"
              checked={isDark}
              onClick={() =>
                updateSettings({
                  colorMode: "dark",
                  customColorsEnabled: false,
                  invertColors: false,
                })
              }
            />
          </div>

          <div className="space-y-3 border-t pt-4">
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={decreaseTextSize}
                disabled={settings.bodyFontSize <= BODY_FONT_SIZE_MIN}
                aria-label={`${a.textSize.decreaseBtn} (${a.textSize.bodySizeLabel})`}
                title={`${a.textSize.decreaseBtn} — ${a.textSize.bodySizeLabel}`}
                className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-2xl border bg-surface p-2 text-foreground transition-colors hover:border-primary/40 hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-45"
              >
                <span className="text-3xl font-bold leading-none">{a.textSize.decreaseBtn}</span>
                <span className="text-xs font-semibold leading-tight text-muted-foreground">
                  {smallerName}
                </span>
              </button>
              <button
                type="button"
                onClick={resetTextSize}
                aria-label={`${a.textSize.defaultBtn} (${a.textSize.defaultTag})`}
                title={`${a.textSize.defaultBtn} — ${a.textSize.defaultTag}`}
                className={`flex aspect-square flex-col items-center justify-center gap-1.5 rounded-2xl border p-2 transition-colors ${
                  settings.bodyFontSize === BODY_FONT_SIZE_DEFAULT
                    ? "border-primary bg-primary text-primary-foreground"
                    : "bg-surface text-foreground hover:border-primary/40 hover:bg-secondary"
                }`}
              >
                <span className="text-3xl font-bold leading-none">{a.textSize.defaultBtn}</span>
                <span className="text-xs font-semibold leading-tight opacity-90">
                  {a.textSize.defaultTag}
                </span>
              </button>
              <button
                type="button"
                onClick={increaseTextSize}
                disabled={settings.bodyFontSize >= BODY_FONT_SIZE_MAX}
                aria-label={`${a.textSize.increaseBtn} (${a.textSize.bodySizeLabel})`}
                title={`${a.textSize.increaseBtn} — ${a.textSize.bodySizeLabel}`}
                className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-2xl border bg-surface p-2 text-foreground transition-colors hover:border-primary/40 hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-45"
              >
                <span className="text-3xl font-bold leading-none">{a.textSize.increaseBtn}</span>
                <span className="text-xs font-semibold leading-tight text-muted-foreground">
                  {largerName}
                </span>
              </button>
            </div>

            <LabeledSlider
              id="a11y-body-size-slider"
              label={a.textSize.bodySizeLabel}
              title={a.textSize.bodySizeDesc}
              icon={<Type className="h-4 w-4" aria-hidden="true" />}
              valueLabel={
                settings.bodyFontSize === BODY_FONT_SIZE_DEFAULT
                  ? `${settings.bodyFontSize}px (${a.textSize.defaultTag})`
                  : `${settings.bodyFontSize}px`
              }
              min={BODY_FONT_SIZE_MIN}
              max={BODY_FONT_SIZE_MAX}
              step={1}
              value={settings.bodyFontSize}
              onChange={(bodyFontSize) => updateSettings({ bodyFontSize })}
              readoutTestId="a11y-body-size-readout"
            />

            <LabeledSlider
              id="a11y-heading-scale"
              label={a.textSize.headingScaleLabel}
              title={a.textSize.headingScaleDesc}
              icon={<Heading className="h-4 w-4" aria-hidden="true" />}
              valueLabel={`${settings.headingScale}%`}
              min={HEADING_SCALE_MIN}
              max={HEADING_SCALE_MAX}
              step={5}
              value={settings.headingScale}
              onChange={(headingScale) => updateSettings({ headingScale })}
            />

            <LabeledSlider
              id="a11y-interface-scale"
              label={a.textSize.interfaceScaleLabel}
              title={a.textSize.interfaceScaleDesc}
              icon={<Monitor className="h-4 w-4" aria-hidden="true" />}
              valueLabel={`${settings.interfaceScale}%`}
              min={INTERFACE_SCALE_MIN}
              max={INTERFACE_SCALE_MAX}
              step={5}
              value={settings.interfaceScale}
              onChange={(interfaceScale) => updateSettings({ interfaceScale })}
            />
          </div>
        </div>

        <footer className="grid grid-cols-2 gap-3 border-t px-5 py-3">
          <button
            type="button"
            onClick={resetSettings}
            className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border bg-surface px-3 py-2.5 text-xs font-semibold text-foreground transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <RotateCcw className="h-6 w-6" aria-hidden="true" />
            <span>{a.resetAll}</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex flex-col items-center justify-center gap-1.5 rounded-2xl bg-primary px-3 py-2.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Check className="h-6 w-6" aria-hidden="true" />
            <span>{t.common.close}</span>
          </button>
        </footer>
      </section>
    </div>
  );
}
