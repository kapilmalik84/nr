/*
 * Parses two formats produced by the migration script:
 *
 * Old (pre-fix): single row with inline M:/E:
 *   "Tracy Hicks, General Manager, Australia PostM: 0477 027 860E: tracy@..."
 *
 * New (post-fix): separate rows per line
 *   "Tracy Hicks, General Manager, Australia Post"
 *   "M: 0477 027 860"
 *   "E: tracy@..."
 */

function parseContacts(rows) {
  const contacts = [];
  let current = null;

  rows.forEach((text) => {
    const t = text.trim();
    if (!t) return;

    // Skip heading rows ("Media contact:", "National Media Line", etc.)
    if (/^media contact/i.test(t) || /^national media line/i.test(t)) return;

    // Detect M: at start (new multi-line format)
    const mStart = t.match(/^M:\s*(.+)/i);
    if (mStart) {
      if (current) current.phone = mStart[1].trim();
      return;
    }

    // Detect E: at start (new multi-line format)
    const eStart = t.match(/^E:\s*(.+)/i);
    if (eStart) {
      if (current) current.email = eStart[1].trim();
      return;
    }

    // Old single-line format: "Name, Role OrgM: phone E: email"
    // M: appears inline (not at start)
    const inlineM = t.match(/^(.+?)\s*M:\s*(\+?[\d][\d\s]{5,})/i);
    if (inlineM) {
      const phone = inlineM[2].trim();
      const emailM = t.match(/E:\s*([\w.+%-]+@[\w.-]+\.[\w]{2,})/i);
      current = {
        name: inlineM[1].trim(),
        phone,
        email: emailM ? emailM[1].trim() : '',
      };
      contacts.push(current);
      return;
    }

    // Plain name/role line → start a new contact
    current = { name: t, phone: '', email: '' };
    contacts.push(current);
  });

  return contacts;
}

export default function decorate(block) {
  const rows = [...block.children].map((row) => {
    const cell = row.firstElementChild;
    return cell ? cell.textContent.trim() : '';
  }).filter(Boolean);

  block.textContent = '';

  const heading = document.createElement('p');
  heading.className = 'media-contact-heading';
  heading.textContent = 'Media contact:';
  block.append(heading);

  const contacts = parseContacts(rows);
  contacts.forEach((contact) => {
    const person = document.createElement('div');
    person.className = 'media-contact-person';

    const nameP = document.createElement('p');
    nameP.className = 'media-contact-name';
    nameP.textContent = contact.name;
    person.append(nameP);

    if (contact.phone) {
      const phoneP = document.createElement('p');
      phoneP.className = 'media-contact-detail';
      const a = document.createElement('a');
      a.href = `tel:${contact.phone.replace(/\s+/g, '')}`;
      a.textContent = contact.phone;
      phoneP.append(document.createTextNode('M: '), a);
      person.append(phoneP);
    }

    if (contact.email) {
      const emailP = document.createElement('p');
      emailP.className = 'media-contact-detail';
      const a = document.createElement('a');
      a.href = `mailto:${contact.email}`;
      a.textContent = contact.email;
      emailP.append(document.createTextNode('E: '), a);
      person.append(emailP);
    }

    block.append(person);
  });
}
