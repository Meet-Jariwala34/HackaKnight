document.addEventListener("DOMContentLoaded", () => {
    const dropzone = document.getElementById("dropzone");
    const resumeInput = document.getElementById("resumeInput");
    const browseBtn = document.getElementById("browseBtn");
    const dropzoneContent = document.getElementById("dropzoneContent");
    const filePreview = document.getElementById("filePreview");
    const fileName = document.getElementById("fileName");
    const fileSize = document.getElementById("fileSize");
    const removeFileBtn = document.getElementById("removeFileBtn");
    const uploadAlert = document.getElementById("uploadAlert");
    const alertMessage = document.getElementById("alertMessage");
    const submitBtn = document.getElementById("submitBtn");
    const progressFill = document.getElementById("progressFill");
    const progressText = document.getElementById("progressText");

    const fileIconContainer = document.getElementById("fileIconContainer");
    const imageThumbnail = document.getElementById("imageThumbnail");
    const previewImg = document.getElementById("previewImg");

    const MAX_FILE_SIZE_MB = 5;
    const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

    // Store the currently selected file
    let selectedFile = null;

    // Allowed file types
    const validExtensions = [
        "pdf",
        "doc",
        "docx",
        "png",
        "jpg",
        "jpeg",
        "webp"
    ];

    const imageExtensions = [
        "png",
        "jpg",
        "jpeg",
        "webp"
    ];

    // Open native file dialog
    browseBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        resumeInput.click();
    });

    dropzone.addEventListener("click", () => {
        if (filePreview.style.display === "none") {
            resumeInput.click();
        }
    });

    // Drag and Drop
    ["dragenter", "dragover"].forEach((eventName) => {
        dropzone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropzone.classList.add("drag-over");
        });
    });

    ["dragleave", "drop"].forEach((eventName) => {
        dropzone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropzone.classList.remove("drag-over");
        });
    });

    dropzone.addEventListener("drop", (e) => {
        const files = e.dataTransfer.files;

        if (files.length > 0) {
            handleFileSelection(files[0]);
        }
    });

    // File input
    resumeInput.addEventListener("change", (e) => {
        if (e.target.files.length > 0) {
            handleFileSelection(e.target.files[0]);
        }
    });

    // Remove selected file
    removeFileBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        resetUpload();
    });

    // Submit / Upload button
    submitBtn.addEventListener("click", async (e) => {
        e.preventDefault();

        if (!selectedFile) {
            showAlert("Please select a resume first.");
            return;
        }

        await uploadResume(selectedFile);
    });

    function handleFileSelection(file) {
        hideAlert();

        // Validate size
        if (file.size > MAX_FILE_SIZE_BYTES) {
            showAlert(
                `File "${file.name}" exceeds the ${MAX_FILE_SIZE_MB} MB limit (${formatBytes(file.size)}).`
            );

            resetUpload();
            return;
        }

        // Validate extension
        const fileExt = file.name.split(".").pop().toLowerCase();

        if (!validExtensions.includes(fileExt)) {
            showAlert(
                "Invalid file type. Please upload a PDF, DOC, DOCX, PNG, JPG, JPEG, or WEBP file."
            );

            resetUpload();
            return;
        }

        // Store selected file
        selectedFile = file;

        // Image preview
        if (imageExtensions.includes(fileExt)) {
            const reader = new FileReader();

            reader.onload = (e) => {
                previewImg.src = e.target.result;
                imageThumbnail.style.display = "block";
                fileIconContainer.style.display = "none";
            };

            reader.readAsDataURL(file);
        } else {
            imageThumbnail.style.display = "none";
            fileIconContainer.style.display = "flex";
        }

        // Update UI
        fileName.textContent = file.name;
        fileSize.textContent = formatBytes(file.size);

        dropzoneContent.style.display = "none";
        filePreview.style.display = "block";

        submitBtn.disabled = false;

        // Reset progress
        progressFill.style.width = "0%";
        progressText.textContent = "Ready to upload";
    }

    // =========================================================
    // ACTUAL RESUME UPLOAD
    // =========================================================

    async function uploadResume(file) {
        submitBtn.disabled = true;

        progressFill.style.width = "0%";
        progressText.textContent = "Uploading... 0%";

        const formData = new FormData();

        // "resume" must match the field name expected by your backend
        formData.append("resume", file);

        try {
            const xhr = new XMLHttpRequest();

            // Upload progress
            xhr.upload.addEventListener("progress", (e) => {
                if (e.lengthComputable) {
                    const percent = Math.round(
                        (e.loaded / e.total) * 100
                    );

                    progressFill.style.width = `${percent}%`;
                    progressText.textContent = `Uploading... ${percent}%`;
                }
            });

            // Upload completed
            xhr.addEventListener("load", () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    progressFill.style.width = "100%";
                    progressText.textContent = "Upload Complete";

                    showAlert("Resume uploaded successfully!");

                    // If your backend returns JSON, you can access it here
                    try {
                        const response = JSON.parse(xhr.responseText);
                        console.log("Server response:", response);
                    } catch (error) {
                        console.log("Server response:", xhr.responseText);
                    }

                    submitBtn.disabled = false;
                } else {
                    progressText.textContent = "Upload Failed";

                    showAlert(
                        "Resume upload failed. Please try again."
                    );

                    submitBtn.disabled = false;
                }
            });

            // Network/server error
            xhr.addEventListener("error", () => {
                progressText.textContent = "Upload Failed";

                showAlert(
                    "Unable to upload the resume. Please check your server connection."
                );

                submitBtn.disabled = false;
            });

            // Send file to backend
            xhr.open("POST", "/upload-resume", true);

            xhr.send(formData);

        } catch (error) {
            console.error("Upload error:", error);

            progressText.textContent = "Upload Failed";

            showAlert(
                "Something went wrong while uploading the resume."
            );

            submitBtn.disabled = false;
        }
    }

    function resetUpload() {
        selectedFile = null;

        resumeInput.value = "";

        dropzoneContent.style.display = "block";
        filePreview.style.display = "none";

        imageThumbnail.style.display = "none";
        fileIconContainer.style.display = "flex";

        submitBtn.disabled = true;

        progressFill.style.width = "0%";
        progressText.textContent = "";
    }

    function showAlert(msg) {
        alertMessage.textContent = msg;
        uploadAlert.style.display = "flex";
    }

    function hideAlert() {
        uploadAlert.style.display = "none";
    }

    function formatBytes(bytes) {
        if (bytes === 0) return "0 Bytes";

        const k = 1024;
        const sizes = ["Bytes", "KB", "MB"];
        const i = Math.floor(
            Math.log(bytes) / Math.log(k)
        );

        return (
            parseFloat(
                (bytes / Math.pow(k, i)).toFixed(2)
            ) +
            " " +
            sizes[i]
        );
    }
});