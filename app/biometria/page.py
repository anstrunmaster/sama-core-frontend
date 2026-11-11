"""
Router: Comparación facial biométrica.
POST /api/v1/biometric/compare
  - Recibe dos imágenes (reference, captured) como multipart/form-data
  - Retorna score de similitud (0-100) y resultado de aprobación
"""
import io
import tempfile
import os

from fastapi import APIRouter, File, HTTPException, UploadFile
from pydantic import BaseModel

from app.core.logging import get_logger

log = get_logger(__name__)

router = APIRouter(prefix="/biometric", tags=["biometric"])

APPROVAL_THRESHOLD = 80


class BiometricResult(BaseModel):
    score: int
    approved: bool
    reference_face_found: bool
    captured_face_found: bool
    message: str


@router.post("/compare", response_model=BiometricResult)
async def compare_faces(
    reference: UploadFile = File(..., description="Foto de referencia"),
    captured: UploadFile = File(..., description="Foto capturada en tiempo real"),
) -> BiometricResult:
    """
    Compara dos imágenes faciales y retorna un score de similitud 0-100.

    - score >= 80 → approved: true
    - score <  80 → approved: false
    - Sin rostro detectado → score: 0, approved: false
    - Error de modelo → HTTP 503
    """
    try:
        from deepface import DeepFace
    except ImportError:
        raise HTTPException(
            status_code=503,
            detail="BIOMETRIC_MODELS_UNAVAILABLE: deepface no está instalado.",
        )

    ref_bytes = await reference.read()
    cap_bytes = await captured.read()

    # DeepFace requiere archivos en disco — usamos temporales
    with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as ref_tmp:
        ref_tmp.write(ref_bytes)
        ref_path = ref_tmp.name

    with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as cap_tmp:
        cap_tmp.write(cap_bytes)
        cap_path = cap_tmp.name

    try:
        result = DeepFace.verify(
            img1_path=ref_path,
            img2_path=cap_path,
            model_name="Facenet",
            detector_backend="opencv",
            enforce_detection=False,  # retorna resultado aunque no detecte rostro
        )

        distance: float = result.get("distance", 1.0)
        threshold: float = result.get("threshold", 0.4)
        verified: bool = result.get("verified", False)

        # Normalizar distancia a score 0-100
        # distance=0 → score=100, distance>=threshold*2 → score=0
        normalized = max(0.0, 1.0 - (distance / (threshold * 2)))
        score = int(round(normalized * 100))
        approved = score >= APPROVAL_THRESHOLD

        log.info(
            "biometric_compare_result",
            extra={
                "distance": round(distance, 4),
                "threshold": threshold,
                "score": score,
                "approved": approved,
            },
        )

        return BiometricResult(
            score=score,
            approved=approved,
            reference_face_found=True,
            captured_face_found=True,
            message="APPROVED" if approved else "REJECTED",
        )

    except ValueError as e:
        # DeepFace lanza ValueError cuando no detecta rostro
        err = str(e).lower()
        ref_found = "img1" not in err and "first" not in err
        cap_found = "img2" not in err and "second" not in err

        log.warning("biometric_no_face_detected", extra={"error": str(e)})

        return BiometricResult(
            score=0,
            approved=False,
            reference_face_found=ref_found,
            captured_face_found=cap_found,
            message="No se detectó ningún rostro en la imagen.",
        )

    except Exception as e:
        log.error("biometric_compare_error", extra={"error": str(e)})
        raise HTTPException(status_code=500, detail=f"Error en comparación facial: {str(e)}")

    finally:
        # Limpiar archivos temporales
        try:
            os.unlink(ref_path)
            os.unlink(cap_path)
        except Exception:
            pass
