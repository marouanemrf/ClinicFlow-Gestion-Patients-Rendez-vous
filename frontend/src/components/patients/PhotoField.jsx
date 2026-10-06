import { useRef } from 'react';
import { Trash2, Upload } from 'lucide-react';
import Button from '../ui/Button';
import { AvatarFrame } from './PatientAvatar';
import { ACCEPTED_PHOTO_TYPES } from '../../utils/image';

export default function PhotoField({ previewUrl, name, processing, error, onSelect, onRemove }) {
  const inputRef = useRef(null);

  function handleChange(event) {
    const [file] = event.target.files;
    // Reset so that selecting the same file again still triggers onChange.
    event.target.value = '';
    if (file) onSelect(file);
  }

  return (
    <div className="flex items-center gap-4">
      <AvatarFrame src={previewUrl} name={name || '?'} size="xl" className="ring-slate-100" />
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-700">Photo</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Button
            variant="secondary"
            size="sm"
            icon={Upload}
            loading={processing}
            onClick={() => inputRef.current.click()}
          >
            {previewUrl ? 'Change photo' : 'Upload photo'}
          </Button>
          {previewUrl && (
            <Button variant="ghost" size="sm" icon={Trash2} onClick={onRemove} className="hover:text-rose-600">
              Remove
            </Button>
          )}
        </div>
        {error ? (
          <p className="mt-1.5 text-xs text-rose-600" role="alert">
            {error}
          </p>
        ) : (
          <p className="mt-1.5 text-xs text-slate-500">JPEG, PNG or WebP. Optional, resized automatically.</p>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_PHOTO_TYPES.join(',')}
          onChange={handleChange}
          className="hidden"
          aria-label="Patient photo"
        />
      </div>
    </div>
  );
}
