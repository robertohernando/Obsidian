const { Plugin, PluginSettingTab, Setting } = require('obsidian');

module.exports = class ImagenSelectorPlugin extends Plugin {
    async onload() {
        console.log("Imagen Selector Plugin cargado.");

        // Añadir opciones de configuración
        this.addSettingTab(new ImagenSelectorSettingsTab(this.app, this));

        // Registra un comando para abrir el selector de imágenes
        this.addCommand({
            id: "open-image-selector",
            name: "Abrir Selector de Imágenes",
            editorCallback: async (editor) => {
                const activeFile = this.app.workspace.getActiveFile();
                if (!activeFile) {
                    new Notice("No hay una nota activa.");
                    return;
                }
                const noteTitle = activeFile.basename; // Título de la nota sin extensión
                const { cantidadImagenes, apiKey, idBusqueda } = await this.loadSettings(); // Cargar la configuración
                await this.mostrarSeleccionImagenes(editor, noteTitle, cantidadImagenes, apiKey, idBusqueda);
            },
        });
    }

    // Método para buscar imágenes
    async getImagenes(terminoBusqueda, cantidad = 5, apiKey, idBusqueda) {
        const searchUrl = `https://www.googleapis.com/customsearch/v1?q=${encodeURIComponent(
            terminoBusqueda
        )}&cx=${idBusqueda}&key=${apiKey}&searchType=image`;

        try {
            const response = await fetch(searchUrl);
            if (!response.ok) throw new Error("Error en la búsqueda de imágenes");

            const data = await response.json();
            if (!data.items || data.items.length === 0) {
                throw new Error("No se encontraron imágenes.");
            }

            return data.items.slice(0, cantidad);
        } catch (error) {
            console.error("Error al buscar imágenes:", error);
            return [];
        }
    }

    // Método para mostrar las imágenes y permitir su selección
    async mostrarSeleccionImagenes(editor, terminoBusqueda, cantidadImagenes, apiKey, idBusqueda) {
        const images = await this.getImagenes(terminoBusqueda, cantidadImagenes, apiKey, idBusqueda);

        if (images.length === 0) {
            new Notice("No se encontraron imágenes para el término: " + terminoBusqueda);
            return;
        }

        // Crear el modal
        const modal = document.createElement("div");
        modal.style.position = "fixed";
        modal.style.top = "50%";
        modal.style.left = "50%";
        modal.style.transform = "translate(-50%, -50%)";
        modal.style.background = "#fff";
        modal.style.border = "1px solid #ccc";
        modal.style.boxShadow = "0 4px 8px rgba(0, 0, 0, 0.2)";
        modal.style.zIndex = 1000;
        modal.style.padding = "20px";
        modal.style.width = "80%";
        modal.style.maxHeight = "80%";
        modal.style.overflowY = "auto";

        // Agregar las imágenes al modal
        images.forEach((image, index) => {
            const imgContainer = document.createElement("div");
            imgContainer.style.display = "inline-block";
            imgContainer.style.margin = "10px";
            imgContainer.style.cursor = "pointer";

            const img = document.createElement("img");
            img.src = image.link;
            img.alt = `Imagen ${index + 1}`;
            img.style.width = "150px";
            img.style.height = "150px";
            img.style.objectFit = "cover";

            img.addEventListener("click", () => {
                const markdownImage = `![right|150](${image.link})\n`;
                const cursor = editor.getCursor();
                editor.replaceRange(markdownImage, cursor);
                document.body.removeChild(modal);
            });

            imgContainer.appendChild(img);
            modal.appendChild(imgContainer);
        });

        // Botón de cerrar
        const closeButton = document.createElement("button");
        closeButton.textContent = "Cerrar";
        closeButton.style.display = "block";
        closeButton.style.margin = "20px auto";
        closeButton.addEventListener("click", () => {
            document.body.removeChild(modal);
        });

        modal.appendChild(closeButton);
        document.body.appendChild(modal);
    }

    // Cargar la configuración guardada con valores predeterminados
    async loadSettings() {
        const savedSettings = await this.loadData();
        return savedSettings || { cantidadImagenes: 5, apiKey: "", idBusqueda: "" };
    }

    // Guardar la configuración
    async saveSettings(settings) {
        await this.saveData(settings);
    }

    onunload() {
        console.log("Imagen Selector Plugin descargado.");
    }
};

// Definir las opciones del plugin usando PluginSettingTab
class ImagenSelectorSettingsTab extends PluginSettingTab {
    constructor(app, plugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    async display() {
        const { containerEl } = this;

        // Título
        containerEl.empty();
        containerEl.createEl("h2", { text: "Configuración de Imagen Selector" });

        // Configuración de número de imágenes
        const settings = await this.plugin.loadSettings();  // Cargar las configuraciones guardadas
        new Setting(containerEl)
            .setName("Número de Imágenes")
            .setDesc("Cantidad de imágenes a mostrar en el selector.")
            .addText((text) =>
                text
                    .setPlaceholder("Cantidad")
                    .setValue(String(settings.cantidadImagenes || 5)) // Valor predeterminado
                    .onChange(async (value) => {
                        settings.cantidadImagenes = parseInt(value, 10) || 5; // Guardar la cantidad como un número
                        await this.plugin.saveSettings(settings);
                    })
            );

        // Configuración de la API Key
        new Setting(containerEl)
            .setName("API Key de Google Custom Search")
            .setDesc("Tu API Key para la búsqueda de imágenes.")
            .addText((text) =>
                text
                    .setPlaceholder("API Key")
                    .setValue(settings.apiKey)
                    .onChange(async (value) => {
                        settings.apiKey = value;
                        await this.plugin.saveSettings(settings);
                    })
            );

        // Configuración del ID de Búsqueda (CX)
        new Setting(containerEl)
            .setName("ID de Búsqueda (CX)")
            .setDesc("Tu ID de búsqueda de Google Custom Search.")
            .addText((text) =>
                text
                    .setPlaceholder("ID de Búsqueda")
                    .setValue(settings.idBusqueda)
                    .onChange(async (value) => {
                        settings.idBusqueda = value;
                        await this.plugin.saveSettings(settings);
                    })
            );
    }
}
