import type { useTranslations } from 'next-intl';

type TFunc = ReturnType<typeof useTranslations>;

interface Props {
  userRequest: string;
  setUserRequest: (v: string) => void;
  isLoading: boolean;
  error: string | null;
  onSubmit: (e: React.FormEvent) => void;
  t: TFunc;
}

export default function PromptSection({
  userRequest,
  setUserRequest,
  isLoading,
  error,
  onSubmit,
  t,
}: Props) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="label">
          <span className="label-text font-medium">{t('editRequest.label')}</span>
          <span className="label-text-alt">{t('editRequest.charactersCount', { current: userRequest.length, max: 2000 })}</span>
        </label>
        <textarea
          value={userRequest}
          onChange={(e) => setUserRequest(e.target.value)}
          placeholder={t('editRequest.placeholder')}
          className="textarea textarea-bordered w-full h-32 resize-none"
          maxLength={2000}
          disabled={isLoading}
          required
        />
      </div>
      {error && <div className="alert alert-error"><span>{error}</span></div>}
      <button type="submit" className="btn btn-primary w-full" disabled={isLoading || !userRequest.trim()}>
        {isLoading ? t('buttons.editingImage') : t('buttons.generateNewVersion')}
      </button>
    </form>
  );
}
