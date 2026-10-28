ARG FEDORA_VERSION
FROM docker.io/library/fedora:${FEDORA_VERSION}
ARG FEDORA_VERSION
# Fedora 40/41 are archived; keep all dependency changes inside the image.
RUN if [ "$FEDORA_VERSION" -le 41 ]; then \
      printf '[fedora-archive]\nname=Fedora archive\nbaseurl=https://archives.fedoraproject.org/pub/archive/fedora/linux/releases/%s/Everything/$basearch/os/\nenabled=1\ngpgcheck=1\ngpgkey=file:///etc/pki/rpm-gpg/RPM-GPG-KEY-fedora-%s-$basearch\n[updates-archive]\nname=Fedora updates archive\nbaseurl=https://archives.fedoraproject.org/pub/archive/fedora/linux/updates/%s/Everything/$basearch/\nenabled=1\ngpgcheck=1\ngpgkey=file:///etc/pki/rpm-gpg/RPM-GPG-KEY-fedora-%s-$basearch\n' "$FEDORA_VERSION" "$FEDORA_VERSION" "$FEDORA_VERSION" "$FEDORA_VERSION" > /etc/yum.repos.d/wiggleit-archive.repo; \
      dnf -y --disablerepo='*' --enablerepo='*-archive' install gnome-shell gjs gobject-introspection gtk4 libadwaita mutter mesa-dri-drivers mesa-libEGL mesa-libGL dbus-daemon glib2 glib2-devel gsettings-desktop-schemas unzip nodejs; \
    else \
      dnf -y install gnome-shell gjs gobject-introspection gtk4 libadwaita mutter mesa-dri-drivers mesa-libEGL mesa-libGL dbus-daemon glib2 glib2-devel gsettings-desktop-schemas unzip nodejs; \
    fi \
    && dnf clean all
ENV LIBGL_ALWAYS_SOFTWARE=1
WORKDIR /work
