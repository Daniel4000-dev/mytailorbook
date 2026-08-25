'use client';

import { useState, useTransition } from 'react';
import { renameAffiliate } from './actions';
import styles from './page.module.css';

export default function AffiliateName({ id, name }: { id: string; name: string }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);
  const [pending, startTransition] = useTransition();

  if (!editing) {
    return (
      <button type="button" className={styles.nameButton} onClick={() => setEditing(true)}>
        {name}
      </button>
    );
  }

  function save() {
    setEditing(false);
    if (value.trim() === name || !value.trim()) {
      setValue(name);
      return;
    }
    startTransition(() => {
      renameAffiliate(id, value);
    });
  }

  return (
    <form
      className={styles.nameForm}
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <input
        className={styles.nameInput}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        disabled={pending}
        autoFocus
        onBlur={save}
      />
    </form>
  );
}
