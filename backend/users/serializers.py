# pne-uadb-app/backend/users/serializers.py

from rest_framework import serializers
from django.contrib.auth.hashers import make_password
from .models import CustomUser, Etudiant, Classe, AgentScolarite, Bibliothecaire, Medecin

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = ["id", "first_name", "last_name", "email", "adresse", "telephone", "role"]

class ClasseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Classe
        fields = "__all__"

class EtudiantSerializer(serializers.ModelSerializer):
    # Lecture seule
    user = UserSerializer(read_only=True)
    classe = ClasseSerializer(read_only=True)

    # Écriture : soit on lie un utilisateur existant, soit on crée un utilisateur
    user_id = serializers.PrimaryKeyRelatedField(
        queryset=CustomUser.objects.all(),
        source='user',
        write_only=True,
        required=False
    )

    # Champs pour création combinée (mappés vers first_name / last_name)
    first_name = serializers.CharField(write_only=True, required=False)
    last_name = serializers.CharField(write_only=True, required=False)
    # Vous pouvez aussi accepter nom/prenom et les mapper
    nom = serializers.CharField(write_only=True, required=False)      # -> last_name
    prenom = serializers.CharField(write_only=True, required=False)   # -> first_name
    email = serializers.EmailField(write_only=True, required=False)
    password = serializers.CharField(write_only=True, required=False, style={'input_type': 'password'})
    adresse = serializers.CharField(write_only=True, required=False, allow_blank=True)
    telephone = serializers.CharField(write_only=True, required=False, allow_blank=True)

    # Classe ID pour écriture
    classe_id = serializers.PrimaryKeyRelatedField(
        queryset=Classe.objects.all(),
        source='classe',
        write_only=True
    )

    class Meta:
        model = Etudiant
        fields = "__all__"
        extra_kwargs = {
            'code_permanent': {'required': True},
        }

    def validate(self, data):
        # Vérifier qu'on a soit user_id, soit les champs utilisateur
        user_id_provided = 'user' in data and data['user'] is not None
        combined_provided = all([
            data.get('email'),
            data.get('password'),
            (data.get('first_name') or data.get('prenom')),
            (data.get('last_name') or data.get('nom'))
        ])
        if not (user_id_provided or combined_provided):
            raise serializers.ValidationError(
                "Vous devez fournir soit 'user_id' (utilisateur existant), "
                "soit 'email', 'password', 'first_name'/'prenom' et 'last_name'/'nom'."
            )
        return data

    def create(self, validated_data):
        # Extraire et traiter les champs utilisateur
        user_data = {}
        for field in ['first_name', 'last_name', 'email', 'password', 'adresse', 'telephone', 'nom', 'prenom']:
            if field in validated_data:
                user_data[field] = validated_data.pop(field)

        # Gérer le mapping nom/prenom -> last_name/first_name
        if 'nom' in user_data:
            user_data['last_name'] = user_data.pop('nom')
        if 'prenom' in user_data:
            user_data['first_name'] = user_data.pop('prenom')

        # Si user_id est fourni, on l'utilise directement
        if 'user' in validated_data and validated_data['user'] is not None:
            user = validated_data.pop('user')
        elif user_data.get('email') and user_data.get('password'):
            # Créer un nouvel utilisateur
            username = user_data['email'].split('@')[0]
            base_username = username
            counter = 1
            while CustomUser.objects.filter(username=username).exists():
                username = f"{base_username}{counter}"
                counter += 1

            user = CustomUser(
                username=username,
                first_name=user_data.get('first_name', ''),
                last_name=user_data.get('last_name', ''),
                email=user_data['email'],
                adresse=user_data.get('adresse', ''),
                telephone=user_data.get('telephone', ''),
                role='etudiant'
            )
            user.password = make_password(user_data['password'])
            user.save()
        else:
            raise serializers.ValidationError("Impossible de créer l'étudiant sans utilisateur valide.")

        # Créer l'étudiant
        etudiant = Etudiant.objects.create(user=user, **validated_data)
        return etudiant


# users/serializers.py (ajout à la fin)

class AgentScolariteSerializer(serializers.ModelSerializer):
    # Lecture seule
    user = UserSerializer(read_only=True)

    # Écriture : soit user_id existant, soit création combinée
    user_id = serializers.PrimaryKeyRelatedField(
        queryset=CustomUser.objects.all(),
        source='user',
        write_only=True,
        required=False
    )

    # Champs pour création combinée
    first_name = serializers.CharField(write_only=True, required=False)
    last_name = serializers.CharField(write_only=True, required=False)
    nom = serializers.CharField(write_only=True, required=False)      # -> last_name
    prenom = serializers.CharField(write_only=True, required=False)   # -> first_name
    email = serializers.EmailField(write_only=True, required=False)
    password = serializers.CharField(write_only=True, required=False, style={'input_type': 'password'})
    adresse = serializers.CharField(write_only=True, required=False, allow_blank=True)
    telephone = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = AgentScolarite
        fields = "__all__"

    def validate(self, data):
        user_id_provided = 'user' in data and data['user'] is not None
        combined_provided = all([
            data.get('email'),
            data.get('password'),
            (data.get('first_name') or data.get('prenom')),
            (data.get('last_name') or data.get('nom'))
        ])
        if not (user_id_provided or combined_provided):
            raise serializers.ValidationError(
                "Fournissez soit 'user_id' (utilisateur existant), soit 'email', 'password', prénom/nom."
            )
        return data

    def create(self, validated_data):
        # Extraire les champs utilisateur
        user_data = {}
        for field in ['first_name', 'last_name', 'email', 'password', 'adresse', 'telephone', 'nom', 'prenom']:
            if field in validated_data:
                user_data[field] = validated_data.pop(field)

        if 'nom' in user_data:
            user_data['last_name'] = user_data.pop('nom')
        if 'prenom' in user_data:
            user_data['first_name'] = user_data.pop('prenom')

        if 'user' in validated_data and validated_data['user'] is not None:
            user = validated_data.pop('user')
        elif user_data.get('email') and user_data.get('password'):
            username = user_data['email'].split('@')[0]
            base = username
            counter = 1
            while CustomUser.objects.filter(username=username).exists():
                username = f"{base}{counter}"
                counter += 1
            user = CustomUser(
                username=username,
                first_name=user_data.get('first_name', ''),
                last_name=user_data.get('last_name', ''),
                email=user_data['email'],
                adresse=user_data.get('adresse', ''),
                telephone=user_data.get('telephone', ''),
                role='agent'          # rôle pour AgentScolarite
            )
            user.password = make_password(user_data['password'])
            user.save()
        else:
            raise serializers.ValidationError("Impossible de créer l'agent sans utilisateur valide.")

        agent = AgentScolarite.objects.create(user=user, **validated_data)
        return agent


class BibliothecaireSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    user_id = serializers.PrimaryKeyRelatedField(
        queryset=CustomUser.objects.all(),
        source='user',
        write_only=True,
        required=False
    )
    first_name = serializers.CharField(write_only=True, required=False)
    last_name = serializers.CharField(write_only=True, required=False)
    nom = serializers.CharField(write_only=True, required=False)
    prenom = serializers.CharField(write_only=True, required=False)
    email = serializers.EmailField(write_only=True, required=False)
    password = serializers.CharField(write_only=True, required=False, style={'input_type': 'password'})
    adresse = serializers.CharField(write_only=True, required=False, allow_blank=True)
    telephone = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = Bibliothecaire
        fields = "__all__"

    def validate(self, data):
        user_id_provided = 'user' in data and data['user'] is not None
        combined_provided = all([
            data.get('email'),
            data.get('password'),
            (data.get('first_name') or data.get('prenom')),
            (data.get('last_name') or data.get('nom'))
        ])
        if not (user_id_provided or combined_provided):
            raise serializers.ValidationError(
                "Fournissez soit 'user_id', soit les champs complets pour création combinée."
            )
        return data

    def create(self, validated_data):
        user_data = {}
        for field in ['first_name', 'last_name', 'email', 'password', 'adresse', 'telephone', 'nom', 'prenom']:
            if field in validated_data:
                user_data[field] = validated_data.pop(field)

        if 'nom' in user_data:
            user_data['last_name'] = user_data.pop('nom')
        if 'prenom' in user_data:
            user_data['first_name'] = user_data.pop('prenom')

        if 'user' in validated_data and validated_data['user'] is not None:
            user = validated_data.pop('user')
        elif user_data.get('email') and user_data.get('password'):
            username = user_data['email'].split('@')[0]
            base = username
            counter = 1
            while CustomUser.objects.filter(username=username).exists():
                username = f"{base}{counter}"
                counter += 1
            user = CustomUser(
                username=username,
                first_name=user_data.get('first_name', ''),
                last_name=user_data.get('last_name', ''),
                email=user_data['email'],
                adresse=user_data.get('adresse', ''),
                telephone=user_data.get('telephone', ''),
                role='biblio'
            )
            user.password = make_password(user_data['password'])
            user.save()
        else:
            raise serializers.ValidationError("Impossible de créer le bibliothécaire sans utilisateur valide.")

        bibliothecaire = Bibliothecaire.objects.create(user=user, **validated_data)
        return bibliothecaire


class MedecinSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    user_id = serializers.PrimaryKeyRelatedField(
        queryset=CustomUser.objects.all(),
        source='user',
        write_only=True,
        required=False
    )
    first_name = serializers.CharField(write_only=True, required=False)
    last_name = serializers.CharField(write_only=True, required=False)
    nom = serializers.CharField(write_only=True, required=False)
    prenom = serializers.CharField(write_only=True, required=False)
    email = serializers.EmailField(write_only=True, required=False)
    password = serializers.CharField(write_only=True, required=False, style={'input_type': 'password'})
    adresse = serializers.CharField(write_only=True, required=False, allow_blank=True)
    telephone = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = Medecin
        fields = "__all__"

    def validate(self, data):
        user_id_provided = 'user' in data and data['user'] is not None
        combined_provided = all([
            data.get('email'),
            data.get('password'),
            (data.get('first_name') or data.get('prenom')),
            (data.get('last_name') or data.get('nom'))
        ])
        if not (user_id_provided or combined_provided):
            raise serializers.ValidationError(
                "Fournissez soit 'user_id', soit les champs complets pour création combinée."
            )
        return data

    def create(self, validated_data):
        user_data = {}
        for field in ['first_name', 'last_name', 'email', 'password', 'adresse', 'telephone', 'nom', 'prenom']:
            if field in validated_data:
                user_data[field] = validated_data.pop(field)

        if 'nom' in user_data:
            user_data['last_name'] = user_data.pop('nom')
        if 'prenom' in user_data:
            user_data['first_name'] = user_data.pop('prenom')

        if 'user' in validated_data and validated_data['user'] is not None:
            user = validated_data.pop('user')
        elif user_data.get('email') and user_data.get('password'):
            username = user_data['email'].split('@')[0]
            base = username
            counter = 1
            while CustomUser.objects.filter(username=username).exists():
                username = f"{base}{counter}"
                counter += 1
            user = CustomUser(
                username=username,
                first_name=user_data.get('first_name', ''),
                last_name=user_data.get('last_name', ''),
                email=user_data['email'],
                adresse=user_data.get('adresse', ''),
                telephone=user_data.get('telephone', ''),
                role='medecin'
            )
            user.password = make_password(user_data['password'])
            user.save()
        else:
            raise serializers.ValidationError("Impossible de créer le médecin sans utilisateur valide.")

        medecin = Medecin.objects.create(user=user, **validated_data)
        return medecin