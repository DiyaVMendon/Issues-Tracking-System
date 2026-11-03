import { createElement as h, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate, useOutletContext } from "react-router-dom";
import { NOT_AUTHENTICATED } from "../../actions/controlActionTypes";
import AssetIcon from "../../components/AssetIcon";
import caretDownIcon from "../../assets/icons/caret-down.svg";
import lockIcon from "../../assets/icons/lock.svg";
import logoutIcon from "../../assets/icons/logout.svg";
import moonIcon from "../../assets/icons/moon.svg";
import paletteIcon from "../../assets/icons/palette.svg";
import sunIcon from "../../assets/icons/sun.svg";
import userProfileIcon from "../../assets/icons/user-profile.svg";
import styles from "./userDropdown.module.css";

const getInitials = (name) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "?";

const menuIcon = (src, className = "") =>
  h(AssetIcon, {
    className: `${styles.icon} ${className}`,
    src,
    size: 18,
  });

export function ThemeDialog({ theme, setTheme, onClose }) {
  const [selectedTheme, setSelectedTheme] = useState(theme);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const themeOptions = [
    { name: "light", label: "Light", icon: sunIcon },
    { name: "dark", label: "Dark", icon: moonIcon },
  ];

  return h(
    "div",
    {
      className: styles.dialogBackdrop,
      onMouseDown: (event) => {
        if (event.target === event.currentTarget) onClose();
      },
    },
    h(
      "section",
      {
        className: styles.themeDialog,
        role: "dialog",
        "aria-modal": "true",
        "aria-labelledby": "theme-dialog-title",
      },
      h(
        "div",
        { className: styles.dialogHeading },
        h("span", { className: styles.themeIcon }, menuIcon(paletteIcon)),
        h(
          "div",
          null,
          h("h2", { id: "theme-dialog-title" }, "Change Theme"),
          h("p", null, "Choose your preferred theme for the application."),
        ),
        h(
          "button",
          {
            className: styles.closeDialog,
            type: "button",
            "aria-label": "Close theme settings",
            onClick: onClose,
          },
          "×",
        ),
      ),
      h(
        "div",
        {
          className: styles.themeChoices,
          role: "radiogroup",
          "aria-label": "Application theme",
        },
        themeOptions.map((option) =>
          h(
            "button",
            {
              className: `${styles.themeChoice} ${selectedTheme === option.name ? styles.selectedTheme : ""}`,
              key: option.name,
              type: "button",
              role: "radio",
              "aria-checked": selectedTheme === option.name,
              onClick: () => setSelectedTheme(option.name),
            },
            menuIcon(option.icon),
            h("span", null, option.label),
            selectedTheme === option.name &&
              h(
                "span",
                { className: styles.selectedCheck, "aria-hidden": "true" },
                "✓",
              ),
          ),
        ),
      ),
      h(
        "div",
        { className: styles.dialogActions },
        h(
          "button",
          { className: styles.cancelButton, type: "button", onClick: onClose },
          "Cancel",
        ),
        h(
          "button",
          {
            className: styles.applyButton,
            type: "button",
            onClick: () => {
              setTheme(selectedTheme);
              onClose();
            },
          },
          "Apply",
        ),
      ),
    ),
  );
}

export default function UserDropdown() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { theme, setTheme } = useOutletContext();
  const loggedInUser = useSelector((state) => state.control.loggedInUser);
  const role = localStorage.getItem("role")?.toLowerCase() || "employee";
  const isAdmin = role === "admin";
  const name =
    loggedInUser?.name ||
    localStorage.getItem("userName") ||
    (isAdmin ? "Admin" : "Employee");
  const email = loggedInUser?.email || "";
  const profilePath = isAdmin ? "/admin/profile" : "/employee/profile";
  const [open, setOpen] = useState(false);
  const [themeDialogOpen, setThemeDialogOpen] = useState(false);
  useEffect(() => {
    if (!open && !themeDialogOpen) return undefined;
    const handlePointerDown = (event) => {
      if (
        event.target instanceof Element &&
        !event.target.closest("[data-user-dropdown]")
      ) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
        setThemeDialogOpen(false);
      }
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, themeDialogOpen]);

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("role");
    localStorage.removeItem("userId");
    localStorage.removeItem("userName");
    dispatch({ type: NOT_AUTHENTICATED });
    navigate("/login", { replace: true });
  };

  return h(
    "div",
    { className: styles.userDropdown, "data-user-dropdown": "" },
    h(
      "button",
      {
        className: styles.trigger,
        type: "button",
        "aria-label": `Open ${name}'s account menu`,
        "aria-haspopup": "menu",
        "aria-expanded": open,
        onClick: () => setOpen((current) => !current),
      },
      h("span", { className: styles.avatar }, getInitials(name)),
      h("span", { className: styles.triggerName }, name),
      menuIcon(caretDownIcon, styles.chevron),
    ),
    open &&
      h(
        "div",
        { className: styles.menu, role: "menu", "aria-label": "Account options" },
        h(
          "div",
          { className: styles.accountSummary },
          h("span", { className: styles.summaryAvatar }, menuIcon(userProfileIcon)),
          h(
            "div",
            { className: styles.accountText },
            h("strong", null, name),
            h("span", null, email || "Email unavailable"),
            h(
              "span",
              { className: styles.roleBadge },
              isAdmin ? "Administrator" : "Employee",
            ),
          ),
        ),
        h(
          "div",
          { className: styles.menuItems },
          h(
            Link,
            {
              className: styles.menuItem,
              to: profilePath,
              role: "menuitem",
              onClick: () => setOpen(false),
            },
            menuIcon(userProfileIcon),
            h("span", null, "My Profile"),
          ),
          h(
            Link,
            {
              className: styles.menuItem,
              to: `${profilePath}?tab=password`,
              role: "menuitem",
              onClick: () => setOpen(false),
            },
            menuIcon(lockIcon),
            h("span", null, "Change Password"),
          ),
          h(
            "button",
            {
              className: styles.menuItem,
              type: "button",
              role: "menuitem",
              onClick: () => {
                setThemeDialogOpen(true);
                setOpen(false);
              },
            },
            menuIcon(paletteIcon),
            h("span", null, "Change Theme"),
          ),
        ),
        h(
          "div",
          { className: styles.logoutSection },
          h(
            "button",
            {
              className: `${styles.menuItem} ${styles.logoutItem}`,
              type: "button",
              role: "menuitem",
              onClick: handleLogout,
            },
            menuIcon(logoutIcon),
            h("span", null, "Logout"),
          ),
        ),
      ),
    themeDialogOpen &&
      h(ThemeDialog, {
        theme,
        setTheme,
        onClose: () => setThemeDialogOpen(false),
      }),
  );
}
