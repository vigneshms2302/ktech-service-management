import React from 'react';
import { handleAutoCorrectKeyDown, autoCorrectGeneralText } from '../../utils/autoCorrect.ts';

interface AutoCorrectInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  value: string;
  onChangeValue: (value: string) => void;
  onBlurFormatter?: (value: string) => string;
}

export const AutoCorrectInput: React.FC<AutoCorrectInputProps> = ({
  value,
  onChangeValue,
  onBlurFormatter = autoCorrectGeneralText,
  onKeyDown,
  onBlur,
  onChange,
  spellCheck = true,
  autoCorrect = 'on',
  ...props
}) => {
  return (
    <input
      {...props}
      value={value}
      spellCheck={spellCheck}
      autoCorrect={autoCorrect}
      onChange={(e) => {
        onChangeValue(e.target.value);
        if (onChange) onChange(e);
      }}
      onKeyDown={(e) => {
        handleAutoCorrectKeyDown(e, value, onChangeValue);
        if (onKeyDown) onKeyDown(e);
      }}
      onBlur={(e) => {
        if (onBlurFormatter) {
          onChangeValue(onBlurFormatter(e.target.value));
        }
        if (onBlur) onBlur(e);
      }}
    />
  );
};

interface AutoCorrectTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  value: string;
  onChangeValue: (value: string) => void;
  onBlurFormatter?: (value: string) => string;
}

export const AutoCorrectTextarea: React.FC<AutoCorrectTextareaProps> = ({
  value,
  onChangeValue,
  onBlurFormatter = autoCorrectGeneralText,
  onKeyDown,
  onBlur,
  onChange,
  spellCheck = true,
  autoCorrect = 'on',
  ...props
}) => {
  return (
    <textarea
      {...props}
      value={value}
      spellCheck={spellCheck}
      autoCorrect={autoCorrect}
      onChange={(e) => {
        onChangeValue(e.target.value);
        if (onChange) onChange(e);
      }}
      onKeyDown={(e) => {
        handleAutoCorrectKeyDown(e, value, onChangeValue);
        if (onKeyDown) onKeyDown(e);
      }}
      onBlur={(e) => {
        if (onBlurFormatter) {
          onChangeValue(onBlurFormatter(e.target.value));
        }
        if (onBlur) onBlur(e);
      }}
    />
  );
};
