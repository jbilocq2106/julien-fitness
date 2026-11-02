#!/usr/bin/env python3
"""Génère un lien chiffré ChatGPT -> MyTEAM. Aucun journal de rappel.
Usage : cat rappels.json | python build-private-reminder-link.py 'MYTEAM-PUB1:...'
"""
import base64
import json
import os
import sys
from cryptography.hazmat.primitives import serialization, hashes
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

AAD = b"MyTEAM/private-reminders/v1"
BASE = "https://jbilocq2106.github.io/julien-fitness/myteam/#mt-private-reminders-v1="

def b64(binary):
    return base64.urlsafe_b64encode(binary).decode("ascii").rstrip("=")

def unb64(text):
    return base64.urlsafe_b64decode(text + "=" * (-len(text) % 4))

def link(public_text, payload):
    if not public_text.startswith("MYTEAM-PUB1:"):
        raise ValueError("La clé publique doit commencer par MYTEAM-PUB1:")
    key = serialization.load_der_public_key(unb64(public_text.split(":", 1)[1]))
    if key.key_size != 2048:
        raise ValueError("Taille RSA inattendue")
    if payload.get("schema") != "myteam-private-reminders-v1" or payload.get("version") != 1:
        raise ValueError("Schéma de transfert invalide")
    items = payload.get("items")
    if not isinstance(items, list) or not (1 <= len(items) <= 25):
        raise ValueError("1 à 25 rappels attendus")
    aes_key, iv = os.urandom(32), os.urandom(12)
    encrypted_key = key.encrypt(aes_key, padding.OAEP(mgf=padding.MGF1(hashes.SHA256()), algorithm=hashes.SHA256(), label=None))
    raw = json.dumps(payload, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
    ciphertext = AESGCM(aes_key).encrypt(iv, raw, AAD)
    envelope = {"v":1,"k":b64(encrypted_key),"i":b64(iv),"d":b64(ciphertext)}
    return BASE + b64(json.dumps(envelope, separators=(",", ":")).encode("utf-8"))

if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit("Clé publique MYTEAM-PUB1 attendue en premier argument.")
    payload = json.load(sys.stdin)
    print(link(sys.argv[1], payload))
