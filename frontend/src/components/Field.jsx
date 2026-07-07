export function Field({ label, full, ...inputProps }) {
  return (
    <label className={`field${full ? ' full' : ''}`}>
      {label}
      {inputProps.type === 'textarea'
        ? <textarea rows={2} {...inputProps} type={undefined} />
        : <input {...inputProps} />}
    </label>
  )
}

export function Select({ label, options, full, ...selectProps }) {
  // options: array of [value, label] pairs
  return (
    <label className={`field${full ? ' full' : ''}`}>
      {label}
      <select {...selectProps}>
        {options.map(([value, text]) => (
          <option key={value ?? ''} value={value ?? ''}>{text}</option>
        ))}
      </select>
    </label>
  )
}
