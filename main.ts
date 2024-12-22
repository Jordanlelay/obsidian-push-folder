import { App, FileSystemAdapter, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';
import * as fs from 'fs';
import * as path from 'path';

interface MyPluginSettings {
	folderToCopy: string;
	destination: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	folderToCopy: '',
	destination: ''
}

export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;

	async onload() {
		await this.loadSettings();

		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: 'push-folder-command',
			name: 'Push folder',
			callback: async () => {
				await this.copyFolderContents(this.settings.folderToCopy, this.settings.destination);
			}
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SettingTab(this.app, this));
	}

	onunload() {}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	getVaultPath() {	
		let adapter = this.app.vault.adapter;
		if (adapter instanceof FileSystemAdapter) {
			return adapter.getBasePath();
		}
		return null;
	}

	async copyFolderContents(sourceFolder: string, destinationFolder: string) {
		if (!destinationFolder) {
			new Notice('Must set destination folder');
			return;
		}

		const copy = async (src: string, dest: string) => {
			const entries = await fs.promises.readdir(src, { withFileTypes: true });			
			await fs.promises.mkdir(dest, { recursive: true });

			for (const entry of entries) {
				const srcPath = path.join(src, entry.name);
				const destPath = path.join(dest, entry.name);

				if (entry.isDirectory()) {
					await copy(srcPath, destPath); // Recursively copy directories
				} else {
					await fs.promises.copyFile(srcPath, destPath); // Copy files
				}
			}
		};

		try {
			const vaultPath = this.getVaultPath();
			if (!vaultPath) {
				new Notice('Failed to get vault path');
				return;
			}
			await copy(path.join(vaultPath, sourceFolder), destinationFolder);
			new Notice('Folder copied successfully!');
		} catch (error) {
			console.error('Error copying folder:', error);
			new Notice('Failed to copy folder. Check console for details.');
		}
	}
}

class SettingTab extends PluginSettingTab {
	plugin: MyPlugin;

	constructor(app: App, plugin: MyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();
	
		new Setting(containerEl)
			.setName('Folder to copy')
			.setDesc('Select a folder inside your Obsidian vault')
			.addText(text => text
				.setValue(this.plugin.settings.folderToCopy)
				.setPlaceholder('Enter folder path')
				.onChange(async (value) => {
					this.plugin.settings.folderToCopy = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Destination')
			.setDesc('Where to copy your folder to. Note this will override anything in the destination folder. Think of it like a one-way push.')
			.addText(text => text
				.setValue(this.plugin.settings.destination)
				.setPlaceholder('/Users/emma/src/my-blog/content/')
				.onChange(async (value) => {
					this.plugin.settings.destination = value;
					await this.plugin.saveSettings();
				}));
	}
}