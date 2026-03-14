# -----------------------------------------------------------------------------
# Bastion Host Module
# Creates an e2-micro VM with Ubuntu 24.04 LTS, OS Login enabled, and an
# ephemeral external IP for SSH access to private GKE nodes and Cloud SQL.
#
# NOTE: The SSH firewall rule (allow TCP 22 from authorized_cidr to "bastion"
# tagged instances) is defined in the networking module. Do NOT duplicate here.
# -----------------------------------------------------------------------------

resource "google_compute_instance" "bastion" {
  name         = "${var.project_name}-bastion-${var.environment}"
  machine_type = "e2-micro"
  zone         = var.zone

  boot_disk {
    initialize_params {
      image = "ubuntu-os-cloud/ubuntu-2404-lts-amd64"
      size  = 20
    }
  }

  network_interface {
    subnetwork = var.subnet_id

    # Ephemeral external IP for SSH access
    access_config {}
  }

  metadata = {
    enable-oslogin = "TRUE"
  }

  service_account {
    email  = var.bastion_service_account
    scopes = ["https://www.googleapis.com/auth/cloud-platform"]
  }

  tags = ["bastion"]
}
