import { useCallback, useEffect, useState } from "react";
import api from "../../api";
import { toShortErrorMessage } from "@shared/utils/common";
import { useAutoDismissStatus } from "@shared/hooks/useAutoDismissNotice";

const INITIAL_EMAIL_VERIFICATION = {
    open: false, pendingEmail: "", code: "",
    requesting: false, verifying: false, info: "", error: ""
};

function buildFallbackProfile(userName, userEmail) {
    return {
        name: userName, email: userEmail,
        bio: "", gender: "", dateOfBirth: "", phone: "", photoUrl: "",
        emailVerified: true
    };
}

export default function useCustomerProfile({ authToken, userName, userEmail, needsProfileData }) {
    const fallback = buildFallbackProfile(userName, userEmail);
    const [profileForm, setProfileForm] = useState(fallback);
    const [profileInitialForm, setProfileInitialForm] = useState(fallback);
    const [profileStatus, setProfileStatus] = useState({ loading: false, error: "", success: "" });
    const [emailVerification, setEmailVerification] = useState({ ...INITIAL_EMAIL_VERIFICATION });
    useAutoDismissStatus(profileStatus, setProfileStatus);

    const applyProfileResponse = useCallback(
        (response, fb = profileForm.email) => {
            const user = response.data?.user || {};
            const profile = response.data?.profile || {};
            return {
                name: user.name || profileForm.name, email: user.email || fb,
                bio: profile.bio || "", gender: profile.gender || "",
                dateOfBirth: profile.dateOfBirth ? String(profile.dateOfBirth).slice(0, 10) : "",
                phone: profile.phone || "", photoUrl: profile.photoUrl || "",
                emailVerified: user.emailVerified !== false
            };
        },
        [profileForm]
    );

    const buildProfilePayload = useCallback(
        (emailOverride = profileForm.email) => ({
            name: profileForm.name, email: emailOverride,
            bio: profileForm.bio, gender: profileForm.gender,
            dateOfBirth: profileForm.dateOfBirth || null,
            phone: profileForm.phone, photoUrl: profileForm.photoUrl || ""
        }),
        [profileForm]
    );

    useEffect(() => {
        const fb = buildFallbackProfile(userName, userEmail);
        if (!authToken) {
            if (needsProfileData) { setProfileForm(fb); setProfileInitialForm(fb); }
            return;
        }
        if (!needsProfileData) return;
        const loadProfile = async () => {
            try {
                const response = await api.get("/profile", { headers: { Authorization: `Bearer ${authToken}` } });
                const user = response.data?.user || {};
                const profile = response.data?.profile || {};
                const next = {
                    name: user.name || fb.name, email: user.email || fb.email,
                    bio: profile.bio || "", gender: profile.gender || "",
                    dateOfBirth: profile.dateOfBirth ? String(profile.dateOfBirth).slice(0, 10) : "",
                    phone: profile.phone || "", photoUrl: profile.photoUrl || "",
                    emailVerified: user.emailVerified !== false
                };
                setProfileForm(next);
                setProfileInitialForm(next);
            } catch (_error) {
                setProfileForm(fb);
                setProfileInitialForm(fb);
            }
        };
        loadProfile();
    }, [authToken, userEmail, userName, needsProfileData]);

    const requestEmailVerification = useCallback(async (rawEmail) => {
        const targetEmail = String(rawEmail || "").trim().toLowerCase();
        if (!authToken || !targetEmail) return false;
        setEmailVerification((prev) => ({ ...prev, requesting: true, error: "", info: "" }));
        try {
            const response = await api.post("/profile/email-change/request", { email: targetEmail }, {
                headers: { Authorization: `Bearer ${authToken}` }
            });
            setEmailVerification((prev) => ({
                ...prev, open: true, pendingEmail: targetEmail, requesting: false,
                info: response.data?.message || "Verification code sent to your new email.", error: ""
            }));
            setProfileForm((prev) => ({ ...prev, email: targetEmail, emailVerified: false }));
            return true;
        } catch (error) {
            setEmailVerification((prev) => ({
                ...prev, requesting: false,
                error: toShortErrorMessage(error.response?.data?.message, "Unable to send email verification code."), info: ""
            }));
            return false;
        }
    }, [authToken]);

    const verifyEmailChange = useCallback(async (rawEmail, rawCode) => {
        const targetEmail = String(rawEmail || "").trim().toLowerCase();
        const verificationCode = String(rawCode || "").replace(/\D/g, "").slice(0, 6);
        if (!authToken || !targetEmail || verificationCode.length !== 6) return;
        setEmailVerification((prev) => ({ ...prev, verifying: true, error: "", info: "" }));
        try {
            const response = await api.post("/profile/email-change/verify", { email: targetEmail, verificationCode }, {
                headers: { Authorization: `Bearer ${authToken}` }
            });
            const nextProfile = applyProfileResponse(response, targetEmail);
            setProfileForm(nextProfile);
            setProfileInitialForm(nextProfile);
            setEmailVerification({ ...INITIAL_EMAIL_VERIFICATION, info: "Email verified and updated successfully." });
            setProfileStatus({ loading: false, error: "", success: "Email updated and verified." });
        } catch (error) {
            setEmailVerification((prev) => ({
                ...prev, verifying: false,
                error: toShortErrorMessage(error.response?.data?.message, "Unable to verify email right now."), info: ""
            }));
        }
    }, [authToken, applyProfileResponse]);

    const handleProfileSave = useCallback(async () => {
        if (!authToken) {
            setProfileStatus({ loading: false, error: "Please log in to save your profile.", success: "" });
            return;
        }
        const requestedEmail = String(profileForm.email || "").trim().toLowerCase();
        const currentEmail = String(profileInitialForm.email || "").trim().toLowerCase();
        const emailChanged = Boolean(requestedEmail) && requestedEmail !== currentEmail;
        setProfileStatus({ loading: true, error: "", success: "" });
        setEmailVerification((prev) => ({ ...prev, error: "" }));
        try {
            const response = await api.put("/profile", buildProfilePayload(emailChanged ? currentEmail : requestedEmail), {
                headers: { Authorization: `Bearer ${authToken}` }
            });
            if (!emailChanged) {
                const nextProfile = applyProfileResponse(response, requestedEmail);
                setProfileForm(nextProfile);
                setProfileInitialForm(nextProfile);
                setProfileStatus({ loading: false, error: "", success: "Profile updated." });
                return;
            }
            const otpSent = await requestEmailVerification(requestedEmail);
            const nextProfile = applyProfileResponse(response, currentEmail);
            setProfileForm({ ...nextProfile, email: requestedEmail, emailVerified: false });
            setProfileInitialForm(nextProfile);
            setProfileStatus({
                loading: false, error: "",
                success: otpSent
                    ? "Profile saved. Verify OTP to confirm new email."
                    : "Profile saved, but OTP could not be sent. Try Verify New Email again."
            });
        } catch (error) {
            setProfileStatus({
                loading: false,
                error: toShortErrorMessage(error.response?.data?.message, "Unable to save profile."),
                success: ""
            });
        }
    }, [authToken, profileForm, profileInitialForm, buildProfilePayload, applyProfileResponse, requestEmailVerification]);

    return {
        profileForm, setProfileForm, profileInitialForm, setProfileInitialForm,
        profileStatus, emailVerification, setEmailVerification,
        handleProfileSave, requestEmailVerification, verifyEmailChange
    };
}
