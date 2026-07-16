// Selects only the legal repository relevant to the contract's countries,
// so the system never loads unnecessary legal repositories, per requirements.
const REPOSITORIES = {
  US: "US Federal & State Employment/Contract Law",
  IN: "Indian Contract Act 1872 & Labour Codes",
  UK: "UK Employment Rights Act & Contract Law",
  AE: "UAE Labour Law (Federal Decree-Law No. 33 of 2021)",
  DE: "German BGB & Employment Law",
  SG: "Singapore Employment Act",
  DEFAULT: "General International Contract Law Principles",
};

function selectRepository(countries = []) {
  const matched = countries
    .map((c) => (c ? c.toUpperCase().trim() : ""))
    .filter((c) => REPOSITORIES[c]);

  if (matched.length === 0) return REPOSITORIES.DEFAULT;
  const uniqueRepos = [...new Set(matched.map((c) => REPOSITORIES[c]))];
  return uniqueRepos.join(" & ");
}

module.exports = { selectRepository, REPOSITORIES };
