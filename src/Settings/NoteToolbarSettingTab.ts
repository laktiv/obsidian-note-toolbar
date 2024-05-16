import { App, ButtonComponent, PluginSettingTab, Setting, debounce, normalizePath, setIcon } from 'obsidian';
import NoteToolbarPlugin from '../main';
import { arraymove, debugLog, emptyMessageFr, learnMoreFr, moveElement } from 'src/Utils/Utils';
import ToolbarSettingsModal from './ToolbarSettingsModal';
import { SETTINGS_VERSION, ToolbarItemSettings, ToolbarSettings } from './NoteToolbarSettings';
import { FolderSuggester } from './Suggesters/FolderSuggester';
import { ToolbarSuggester } from './Suggesters/ToolbarSuggester';
import { IconSuggestModal } from './IconSuggestModal';
import Sortable from 'sortablejs';

export class NoteToolbarSettingTab extends PluginSettingTab {

	plugin: NoteToolbarPlugin;
	app: App;

	constructor(app: App, plugin: NoteToolbarPlugin) {
		super(app, plugin);
		this.app = app;
		this.plugin = plugin;
	}

    public openSettingsModal(toolbar: ToolbarSettings) {
        const modal = new ToolbarSettingsModal(this.app, this.plugin, this, toolbar);
		modal.setTitle("Edit Toolbar");
        modal.open();
    }

	/*************************************************************************
	 * SETTINGS DISPLAY
	 *************************************************************************/

	/**
	 * Displays the main settings.
	 */
	public display(focusOnLastItem: boolean = false): void {

		const { containerEl } = this;
		containerEl.empty();

		// TODO: playing with Dataview support
		// new Setting(containerEl)
		// 	.addButton((button: ButtonComponent) => {
		// 		button
		// 			.setButtonText("dv test")
		// 			.onClick(async () => {
		// 				debugLog("Trying dataview...");
		// 				let dv = new DataviewAdapter();
		// 				const result = await dv.evaluate("dv.current().file.mtime");
		// 				debugLog("result: " + result);
		// 			});
		// 	});

		if (this.plugin.settings.version !== SETTINGS_VERSION) {
			new Setting(containerEl)
				.setName("⚠️ Error loading plugin: Please reload")
				.setDesc("Old settings file detected. Please restart plugin.")
				.setClass('note-toolbar-setting-plugin-error')
				.setHeading();
		}

		this.displayToolbarList(containerEl);

		new Setting(containerEl)
			.setName("Display rules")
			.setDesc(learnMoreFr(
				"Define which notes to display toolbars on.", 
				"https://github.com/chrisgurney/obsidian-note-toolbar/wiki/Defining-where-to-show-toolbars"))
			.setHeading();

		this.displayPropertySetting(containerEl);
		this.displayFolderMap(containerEl);
		this.displayMobileSettings(containerEl);

		if (focusOnLastItem) {
			// set focus on last thing in the list, if the label is empty
			let inputToFocus = this.containerEl.querySelector(
				'#note-toolbar-setting-item-field-' + (this.plugin.settings.folderMappings.length - 1) + ' input[type="search"]') as HTMLInputElement;
			if (inputToFocus?.value.length === 0) {
				inputToFocus.focus();
			}
		}

		// scroll to the position when the modal was last open
		this.rememberLastPosition(this.containerEl);

	}

	/**
	 * Displays the list of toolbars.
	 * @param containerEl HTMLElement to add the settings to.
	 */
	displayToolbarList(containerEl: HTMLElement): void {

		const toolbarsDesc = document.createDocumentFragment();
		toolbarsDesc.append(
			"Define the toolbars you want to add to your notes. ",
			toolbarsDesc.createEl("a", {
				href: "https://github.com/chrisgurney/obsidian-note-toolbar/wiki",
				text: "User Guide",
			}),
			" • ",
			toolbarsDesc.createEl("a", {
				href: "https://github.com/chrisgurney/obsidian-note-toolbar/releases",
				text: "v" + this.plugin.manifest.version,
			})
		);

		new Setting(containerEl)
			.setName("Toolbars")
			.setDesc(toolbarsDesc)
			.setClass("note-toolbar-setting-no-controls");

		if (this.plugin.settings.toolbars.length == 0) {
			containerEl
				.createEl("div", { text: emptyMessageFr("Click the button to create a toolbar.") })
				.className = "note-toolbar-setting-empty-message";
		}
		else {
			let toolbarListDiv = containerEl.createDiv();
			toolbarListDiv.addClass("note-toolbar-setting-toolbar-list");
			this.plugin.settings.toolbars.forEach(
				(toolbarItem, index) => {
					new Setting(toolbarListDiv)
						.setName(toolbarItem.name)
						.setDesc(this.createToolbarPreviewFr(toolbarItem.items))
						.addButton((button: ButtonComponent) => {
							button
								.setTooltip("Update this toolbar's items")
								.setButtonText("Edit")
								.setCta()
								.onClick(() => {
									this.openSettingsModal(toolbarItem);
								});
							});
				});
			containerEl.append(toolbarListDiv);
		}

		new Setting(containerEl)
			.setClass("note-toolbar-setting-button")
			.addButton((button: ButtonComponent) => {
				button
					.setTooltip("Add a new toolbar")
					.setButtonText("+ New toolbar")
					.setCta()
					.onClick(async () => {
						let newToolbar = {
							defaultStyles: ["border", "even", "sticky"],
							items: [],
							mobileStyles: [],
							name: "",
							position: { 
								desktop: { allViews: { position: 'props' } }, 
								mobile: { allViews: { position: 'props' } }, 
								tablet: { allViews: { position: 'props' } } },
							updated: new Date().toISOString(),
						} as ToolbarSettings;
						this.plugin.settings.toolbars.push(newToolbar);
						await this.plugin.saveSettings();
						this.openSettingsModal(newToolbar);
					});
			});

	}

	/**
	 * Displays the property setting.
	 * @param containerEl HTMLElement to add the settings to.
	 */
	displayPropertySetting(containerEl: HTMLElement): void {

		new Setting(containerEl)
			.setName("Property")
			.setDesc("If a toolbar name is found in this property, the toolbar will be displayed on the note. Takes precedence over any folder mappings. Set to 'none' to hide the toolbar.")
			.addText(text => text
				.setPlaceholder('Property')
				.setValue(this.plugin.settings.toolbarProp)
				.onChange(debounce(async (value) => {
					this.plugin.settings.toolbarProp = value;
					// FIXME? set all toolbars to updated?
					// this.plugin.settings.toolbars.updated = new Date().toISOString();
					await this.plugin.saveSettings();	
				}, 750)));

	}

	/**
	 * Displays the folder mappings.
	 * @param containerEl HTMLElement to add the settings to.
	 */
	displayFolderMap(containerEl: HTMLElement): void {

		new Setting(containerEl)
			.setName("Folder mappings")
			.setDesc("Notes in folders below will display the toolbar mapped to it. Precedence is top to bottom.")
			.setClass("note-toolbar-setting-no-border");

		if (this.plugin.settings.folderMappings.length == 0) {
			containerEl
				.createEl("div", { text: emptyMessageFr("Click the button to create a mapping.") })
				.className = "note-toolbar-setting-empty-message";
		}
		else {
			let toolbarFolderListDiv = containerEl.createDiv();

			this.plugin.settings.folderMappings.forEach(
				(mapping, index) => {

				let toolbarFolderListItemDiv = containerEl.createDiv();
				toolbarFolderListItemDiv.className = "note-toolbar-setting-folder-list-item-container";

				let textFieldsDiv = this.containerEl.createDiv();
				textFieldsDiv.id = "note-toolbar-setting-item-field-" + index;
				textFieldsDiv.className = "note-toolbar-setting-item-fields";
				const fs = new Setting(textFieldsDiv)
					.setClass("note-toolbar-setting-mapping-field")
					.addSearch((cb) => {
						new FolderSuggester(this.app, cb.inputEl);
						cb.setPlaceholder("Folder")
							.setValue(mapping.folder)
							.onChange(debounce(async (newFolder) => {
                                if (
                                    newFolder &&
                                    this.plugin.settings.folderMappings.some(
                                        (mapping, mapIndex) => {
											return index != mapIndex ? mapping.folder.toLowerCase() === newFolder.toLowerCase() : undefined;
										}
                                    )
                                ) {
									if (document.getElementById("note-toolbar-name-error") === null) {
										let errorDiv = containerEl.createEl("div", { 
											text: "This folder already has a toolbar associated with it.", 
											attr: { id: "note-toolbar-name-error" }, cls: "note-toolbar-setting-error-message" });
										toolbarFolderListItemDiv.insertAdjacentElement('afterend', errorDiv);
										toolbarFolderListItemDiv.children[0].addClass("note-toolbar-setting-error");
									}
                                }
								else {
									document.getElementById("note-toolbar-name-error")?.remove();
									toolbarFolderListItemDiv.children[0].removeClass("note-toolbar-setting-error");
									this.plugin.settings.folderMappings[index].folder = newFolder ? normalizePath(newFolder) : "";
									await this.plugin.saveSettings();
								}
                            }, 250));
					});
				const ts = new Setting(textFieldsDiv)
					.setClass("note-toolbar-setting-mapping-field")
					.addSearch((cb) => {
						new ToolbarSuggester(this.app, this.plugin, cb.inputEl);
						cb.setPlaceholder("Toolbar")
							.setValue(mapping.toolbar)
							.onChange(debounce(async (newToolbar) => {
                                this.plugin.settings.folderMappings[
                                    index
                                ].toolbar = newToolbar;
                                await this.plugin.saveSettings();
                            }, 250));
					});
				let itemControlsDiv = this.containerEl.createDiv();
				itemControlsDiv.className = "note-toolbar-setting-item-controls";
				const s1d = new Setting(itemControlsDiv)
					.addExtraButton((cb) => {
						cb.setIcon("trash")
							.setTooltip("Delete")
							.onClick(async () => this.listMoveHandler(null, index, "delete"));
						cb.extraSettingsEl.setAttribute("tabindex", "0");
						this.plugin.registerDomEvent(
							cb.extraSettingsEl,	'keydown', (e) => this.listMoveHandler(e, index, "delete"));
					})
					.addExtraButton((cb) => {
						cb.setIcon("menu")
							.setTooltip("Drag to rearrange")
							.onClick(() => {})
							.extraSettingsEl.addClass('setting-drag-icon');
					});
				toolbarFolderListItemDiv.append(textFieldsDiv);
				toolbarFolderListItemDiv.append(itemControlsDiv);
				
				toolbarFolderListItemDiv.draggable = true;
				toolbarFolderListItemDiv.setAttribute('note-toolbar-list-index', index.toString());

				toolbarFolderListDiv.append(toolbarFolderListItemDiv);
			});

			var sortable = Sortable.create(toolbarFolderListDiv, {
				onSort: async (item) => {
					// TODO: do we need to check this? no classes are showing:
					// debugLog("sortable: class: ", item.from.className, " -> ", item.to.className);
					debugLog("sortable: index: ", item.oldIndex, " -> ", item.newIndex);
					if (item.oldIndex !== undefined && item.newIndex !== undefined) {
						moveElement(this.plugin.settings.folderMappings, item.oldIndex, item.newIndex);
						await this.plugin.saveSettings();
					}
				}
			});

			containerEl.append(toolbarFolderListDiv);

		}

		new Setting(containerEl)
			.setClass("note-toolbar-setting-button")
			.addButton((button: ButtonComponent) => {
				button
					.setTooltip("Add a new mapping")
					.setButtonText("+ New mapping")
					.setCta()
					.onClick(async () => {
						let newMapping = {
							folder: "",
							toolbar: ""
						};
						this.plugin.settings.folderMappings.push(newMapping);
						await this.plugin.saveSettings();
						this.display(true);
					});
			});

	}

	/**
	 * 
	 * @param containerEl 
	 */
	displayMobileSettings(containerEl: HTMLElement): void {

		new Setting(containerEl)
			.setName("Mobile settings")
			.setHeading();

		const s1 = new Setting(containerEl)
			.setName("Mobile icon")
			.setDesc("Sets the icon for the navigation bar (requires restart) and floating button.")
			.addButton((cb) => {
				cb.setIcon(this.plugin.settings.icon)
					.setTooltip("Select icon")
					.onClick(async (e) => {
						e.preventDefault();
						const modal = new IconSuggestModal(this.plugin, this.plugin.settings, cb.buttonEl);
						modal.open();
					});
				cb.buttonEl.setAttribute("data-note-toolbar-no-icon", !this.plugin.settings.icon ? "true" : "false");
				cb.buttonEl.setAttribute("tabindex", "0");
				this.plugin.registerDomEvent(
					cb.buttonEl, 'keydown', (e) => {
						switch (e.key) {
							case "Enter":
							case " ":
								e.preventDefault();					
								const modal = new IconSuggestModal(this.plugin, this.plugin.settings, cb.buttonEl);
								modal.open();
						}
					});
			});
		
		const s2 = new Setting(containerEl)
			.setName("Show 'Edit toolbar' link in toolbar menus")
			.setDesc("Add an item to access the toolbar's settings in the mobile toolbar menu.")
			.addToggle((cb) => {
				cb.setValue(this.plugin.settings.showEditInFabMenu)
				cb.onChange(async (value) => {
					this.plugin.settings.showEditInFabMenu = value;
					this.plugin.saveSettings();
					// TODO? force the re-rendering of the current toolbar to update the menu
				});
			});

	}

	/*************************************************************************
	 * SETTINGS DISPLAY HANDLERS
	 *************************************************************************/

	/**
	 * Handles moving mappings up and down the list, and deletion, based on click or keyboard event.
	 * @param keyEvent KeyboardEvent, if the keyboard is triggering this handler.
	 * @param index Number of the item in the list we're moving/deleting.
	 * @param action Direction of the move, or "delete".
	 */
	async listMoveHandler(keyEvent: KeyboardEvent | null, index: number, action: 'up' | 'down' | 'delete'): Promise<void> {
		if (keyEvent) {
			switch (keyEvent.key) {
				case 'ArrowUp':
					keyEvent.preventDefault();
					action = 'up';
					break;
				case 'ArrowDown':
					keyEvent.preventDefault();
					action = 'down';
					break;
				case 'Delete':
				case 'Backspace':
					keyEvent.preventDefault();
					action = 'delete';	
				case 'Enter':
				case ' ':
					keyEvent.preventDefault();
					break;
				default:
					return;
			}
		}
		switch (action) {
			case 'up':
				arraymove(this.plugin.settings.folderMappings, index, index - 1);
				break;
			case 'down':
				arraymove(this.plugin.settings.folderMappings, index, index + 1);
				keyEvent?.preventDefault();
				break;
			case 'delete':
				this.plugin.settings.folderMappings.splice(index, 1);
				keyEvent?.preventDefault();
				break;
		}
		await this.plugin.saveSettings();
		this.display();
	}

	private lastScrollPosition: number;
	/**
	 * Remembers the scrolling position of the user and jumps to it on display.
	 * @author Taitava (Shell Commands plugin)
	 * @link https://github.com/Taitava/obsidian-shellcommands/blob/8d030a23540d587a85bd0dfe2e08c8e6b6b955ab/src/settings/SC_MainSettingsTab.ts#L701 
	*/
    private rememberLastPosition(containerEl: HTMLElement) {

		debugLog("rememberLastPosition:", containerEl);

        // go to the last position
		containerEl.scrollTo({
			top: this.lastScrollPosition,
			behavior: "auto",
		});

        // listen to changes
        this.plugin.registerDomEvent(containerEl, 'scroll', (event) => {
            this.lastScrollPosition = containerEl.scrollTop;
		});

    }

	/*************************************************************************
	 * UTILITIES
	 *************************************************************************/

	/**
	 * Constructs a preview of the given toolbar, including the icons used.
	 * @param toolbarItems Array of ToolbarItemSettings to display in the preview.
	 * @returns DocumentFragment
	 */
	private createToolbarPreviewFr(toolbarItems: ToolbarItemSettings[]): DocumentFragment {
		let toolbarFr: DocumentFragment = document.createDocumentFragment();
		if (toolbarItems.length > 0) {
			toolbarItems
				.filter((item: ToolbarItemSettings) => {
					// ignore all empty toolbar items (no label or icon)
					return ((item.label === "" && item.icon === "") ? false : true);
				})
		 		.map(item => {
					let itemFr = toolbarFr.createDiv();
					itemFr.addClass("note-toolbar-setting-toolbar-list-preview-item");
					let iconFr = toolbarFr.createSpan();
					let labelFr = toolbarFr.createSpan();
					if (item.icon) {
						setIcon(iconFr, item.icon);
						toolbarFr.append(iconFr);
					}
					if (item.label) {
						labelFr.textContent = item.label;
						toolbarFr.append(labelFr);
					}
					itemFr.append(iconFr, labelFr);
					toolbarFr.append(itemFr);
				});
		}
		else {
			toolbarFr = emptyMessageFr("No toolbar items. Click Edit to update this toolbar.");
		}
		return toolbarFr;
	}

}