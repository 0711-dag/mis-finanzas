export default function ValidationToast({ message }) {
  if (!message) return null;
  return <div className="toast">⚠️ {message}</div>;
}
