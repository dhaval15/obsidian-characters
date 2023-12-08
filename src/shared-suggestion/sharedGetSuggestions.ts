import fuzzysort from "fuzzysort";
import { type TFile } from "obsidian";
import { type AtSymbolLinkingSettings } from "src/settings/settings";
import { type fileOption } from "src/types";

export function sharedGetSuggestions(
	folder: string,
	files: TFile[],
	query: string,
	settings: AtSymbolLinkingSettings
): Fuzzysort.KeysResult<fileOption>[] {
	const options: fileOption[] = [];
	for (const file of files) {
		// checks if the file is from folder
		if (!file.path.startsWith(folder)) {
			continue;
		}
		const meta = app.metadataCache.getFileCache(file);
		if (meta?.frontmatter?.alias) {
			options.push({
				fileName: file.basename,
				filePath: file.path,
				alias: meta.frontmatter.alias,
			});
		} else if (meta?.frontmatter?.aliases) {
			let aliases = meta.frontmatter.aliases;
			if (typeof meta.frontmatter.aliases === "string") {
				aliases = meta.frontmatter.aliases
					.split(",")
					.map((s) => s.trim());
			}
			for (const alias of aliases) {
				options.push({
					fileName: file.basename,
					filePath: file.path,
					alias: alias,
				});
			}
		}
		// Include fileName without alias as well
		options.push({
			fileName: file.basename,
			filePath: file.path,
		});
	}

	// Show all files when no query
	let results = [];
	if (!query) {
		results = options
			.map((option) => ({
				obj: option,
			}))
			// Reverse because filesystem is sorted alphabetically
			.reverse();
	} else {
		// Fuzzy search files based on query
		results = fuzzysort.go(query, options, {
			keys: ["alias", "fileName"],
		}) as any;
	}

	// If showAddNewNote option is enabled, show it as the last option
	if (settings.showAddNewNote && query) {
		// Don't show if it has the same filename as an existing note
		const hasExistingNote = results.some(
			(result: Fuzzysort.KeysResult<fileOption>) =>
				result?.obj?.fileName.toLowerCase() === query?.toLowerCase()
		);
		if (!hasExistingNote) {
			results = results.filter(
				(result: Fuzzysort.KeysResult<fileOption>) =>
					!result.obj?.isCreateNewOption
			);
			const separator = settings.addNewNoteDirectory ? "/" : "";
			results.push({
				obj: {
					isCreateNewOption: true,
					query: query,
					fileName: "Create new note",
					filePath: `${settings.addNewNoteDirectory.trim()}${separator}${query.trim()}.md`,
				},
			});
		}
	}

	return results;
}
